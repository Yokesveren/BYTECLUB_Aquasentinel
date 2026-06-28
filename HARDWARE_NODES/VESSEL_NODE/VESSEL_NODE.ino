// ============================================================
//  AQUA-SENTINEL — VESSEL NODE
//  Hardware : ESP32 + LoRa SX1278 + MPU6050 + SSD1306 OLED
//             + Physical SOS push-button
//
//  Role     : Worn / mounted on a fishing or commute vessel.
//             Sends distress packets hop-by-hop through the
//             mesh (Buoy Nodes → Gateway Node → Dashboard).
//
//  Trigger sources:
//    1. Physical SOS button pressed by the fisherman
//    2. MPU6050 detects capsize / severe tilt beyond threshold
//
//  3-Layer false-positive protection:
//    Layer 1 – MPU6050 threshold breach detected
//    Layer 2 – 10-second countdown on OLED; button cancel allowed
//    Layer 3 – HMAC vessel-ID signature in every packet
//
//  Packet format (JSON string over LoRa):
//    {"type":"SOS","id":"VN-001","trigger":"CAPSIZE",
//     "tilt":45.2,"seq":12,"sig":"A7F3"}
//
//  Libraries needed (install via Arduino Library Manager):
//    • LoRa             by Sandeep Mistry
//    • Adafruit SSD1306 by Adafruit
//    • Adafruit GFX     by Adafruit
//    • MPU6050          by Electronic Cats  (or I2Cdev)
//    • ArduinoJson      by Benoit Blanchon
// ============================================================

#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <MPU6050.h>
#include <ArduinoJson.h>

// ------------------------------------------------------------
// VESSEL IDENTITY  –– change this per vessel before flashing
// ------------------------------------------------------------
#define VESSEL_ID        "VN-001"   // unique vessel node ID
#define VESSEL_NAME      "FISHER-1" // human-readable name

// ------------------------------------------------------------
// PIN DEFINITIONS
// ------------------------------------------------------------

// LoRa SX1278 (hardware SPI on ESP32)
#define LORA_SCK         18
#define LORA_MISO        19
#define LORA_MOSI        23
#define LORA_CS          5    // NSS / Chip Select
#define LORA_RST         14   // RESET
#define LORA_IRQ         2    // DIO0 / interrupt

// OLED SSD1306 (I2C)
#define OLED_SDA         21
#define OLED_SCL         22
#define SCREEN_WIDTH     128
#define SCREEN_HEIGHT    64
#define OLED_RESET       -1   // shared reset with ESP32

// MPU6050 (I2C — same bus as OLED)
// SDA = 21, SCL = 22 (no extra defines needed)

// SOS Button
#define SOS_BUTTON_PIN   13   // active-LOW, internal pull-up enabled

// Status LED (optional — lights red during distress)
#define LED_PIN          4

// ------------------------------------------------------------
// LoRa RADIO SETTINGS
// ------------------------------------------------------------
#define LORA_FREQUENCY   433E6   // 433 MHz (use 915E6 for 915 MHz region)
#define LORA_TX_POWER    17      // dBm  (max 20, legal limit varies)
#define LORA_BANDWIDTH   125E3   // Hz
#define LORA_SF          10      // Spreading Factor 10 → ~10 km range
#define LORA_CR          5       // Coding Rate 4/5

// ------------------------------------------------------------
// TIMING
// ------------------------------------------------------------
#define HEARTBEAT_INTERVAL   30000  // ms — normal status packet
#define SOS_REPEAT_INTERVAL   5000  // ms — repeat SOS until acked
#define CANCEL_WINDOW        10000  // ms — auto-capsize cancel window
#define DEBOUNCE_MS            200  // ms — SOS button debounce

// ------------------------------------------------------------
// MPU6050 CAPSIZE THRESHOLDS
// ------------------------------------------------------------
// Tilt is calculated as angle from vertical (0° = upright)
// Adjust CAPSIZE_THRESHOLD to match your boat's normal roll
#define CAPSIZE_THRESHOLD     40.0  // degrees — triggers warning
#define CAPSIZE_CONFIRM_MS   2000   // ms tilt must persist before alert

// ------------------------------------------------------------
// PACKET TYPES
// ------------------------------------------------------------
#define PKT_HEARTBEAT    "HB"
#define PKT_SOS_BUTTON   "SOS_BTN"
#define PKT_SOS_CAPSIZE  "SOS_CAP"
#define PKT_CANCEL       "CANCEL"

// ------------------------------------------------------------
// GLOBALS
// ------------------------------------------------------------
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
MPU6050 mpu;

uint32_t lastHeartbeat    = 0;
uint32_t lastSosSend      = 0;
uint32_t capsizeStartTime = 0;   // when tilt first exceeded threshold
uint32_t cancelWindowStart = 0;  // when cancel countdown began

bool inDistress           = false;
bool cancelWindowOpen     = false;
bool capsizeSustained     = false;

String  activeAlertType   = "";
uint16_t packetSeq        = 0;    // increments every transmission

// Simple HMAC — XOR fold of vessel ID chars with seq number
// (upgrade to HMAC-SHA256 if you add a crypto library)
String computeSig(uint16_t seq) {
    uint8_t h = 0;
    for (char c : String(VESSEL_ID)) h ^= (uint8_t)c;
    h ^= (seq & 0xFF);
    h ^= ((seq >> 8) & 0xFF);
    char buf[5];
    snprintf(buf, sizeof(buf), "%04X", (uint16_t)(h * 0xA5));
    return String(buf);
}

// ------------------------------------------------------------
// OLED HELPERS
// ------------------------------------------------------------
void oledClear() {
    display.clearDisplay();
    display.setTextColor(WHITE);
}

void oledHeader(const char* title) {
    display.setCursor(0, 0);
    display.setTextSize(1);
    display.println(title);
    display.drawFastHLine(0, 9, 128, WHITE);
}

void oledShow() {
    display.display();
}

// Show normal status screen
void showStatusScreen(float tiltAngle, bool loraOk) {
    oledClear();
    oledHeader("AQUA-SENTINEL  " VESSEL_ID);
    display.setCursor(0, 13);
    display.print("STATUS: ");
    display.println(inDistress ? "*** SOS ***" : "NORMAL");
    display.setCursor(0, 24);
    display.print("TILT : ");
    display.print(tiltAngle, 1);
    display.println(" deg");
    display.setCursor(0, 35);
    display.print("LoRa : ");
    display.println(loraOk ? "ONLINE" : "ERROR");
    display.setCursor(0, 46);
    display.print("PKT# : ");
    display.println(packetSeq);
    display.setCursor(0, 57);
    display.setTextSize(1);
    if (inDistress) {
        display.setTextColor(WHITE);
        display.print(">> HOLD BTN 2s TO CANCEL <<");
    } else {
        display.print("Press btn = SOS");
    }
    oledShow();
}

// Show cancel countdown (3-layer false-positive protection)
void showCancelCountdown(uint32_t remainingMs) {
    oledClear();
    oledHeader("!! CAPSIZE ALERT !!");
    display.setTextSize(2);
    display.setCursor(20, 18);
    uint8_t secs = (remainingMs / 1000) + 1;
    display.print("SEND IN ");
    display.println(secs);
    display.setTextSize(1);
    display.setCursor(0, 48);
    display.println("Press SOS btn to CANCEL");
    oledShow();
}

// Show distress confirmation
void showDistressActive(const char* trigger) {
    oledClear();
    oledHeader("  *** DISTRESS ***  ");
    display.setTextSize(1);
    display.setCursor(0, 14);
    display.println("SOS SIGNAL SENT");
    display.setCursor(0, 26);
    display.print("CAUSE: ");
    display.println(trigger);
    display.setCursor(0, 38);
    display.println("Repeating every 5s");
    display.setCursor(0, 50);
    display.println("Hold BTN 2s to cancel");
    oledShow();
}

// Show cancelled
void showCancelled() {
    oledClear();
    oledHeader("AQUA-SENTINEL");
    display.setTextSize(2);
    display.setCursor(8, 22);
    display.println("CANCELLED");
    display.setTextSize(1);
    display.setCursor(0, 52);
    display.println("Alert cleared. Stay safe.");
    oledShow();
    delay(2000);
}

// ------------------------------------------------------------
// LoRa PACKET BUILDER + SENDER
// ------------------------------------------------------------
void sendPacket(const char* pktType, float tiltVal) {
    packetSeq++;
    StaticJsonDocument<256> doc;
    doc["type"]    = pktType;
    doc["id"]      = VESSEL_ID;
    doc["name"]    = VESSEL_NAME;
    doc["trigger"] = pktType;
    doc["tilt"]    = serialized(String(tiltVal, 2));
    doc["seq"]     = packetSeq;
    doc["sig"]     = computeSig(packetSeq);

    String payload;
    serializeJson(doc, payload);

    LoRa.beginPacket();
    LoRa.print(payload);
    LoRa.endPacket();

    Serial.print("[TX] ");
    Serial.println(payload);
}

// Heartbeat — lets gateway know this vessel is alive
void sendHeartbeat(float tiltVal) {
    packetSeq++;
    StaticJsonDocument<200> doc;
    doc["type"]  = PKT_HEARTBEAT;
    doc["id"]    = VESSEL_ID;
    doc["name"]  = VESSEL_NAME;
    doc["tilt"]  = serialized(String(tiltVal, 2));
    doc["seq"]   = packetSeq;
    doc["sig"]   = computeSig(packetSeq);

    String payload;
    serializeJson(doc, payload);

    LoRa.beginPacket();
    LoRa.print(payload);
    LoRa.endPacket();

    Serial.print("[HB] ");
    Serial.println(payload);
}

// Cancel message — tells gateway this was a false positive
void sendCancel() {
    packetSeq++;
    StaticJsonDocument<160> doc;
    doc["type"] = PKT_CANCEL;
    doc["id"]   = VESSEL_ID;
    doc["seq"]  = packetSeq;
    doc["sig"]  = computeSig(packetSeq);

    String payload;
    serializeJson(doc, payload);

    LoRa.beginPacket();
    LoRa.print(payload);
    LoRa.endPacket();

    Serial.println("[CANCEL SENT]");
}

// ------------------------------------------------------------
// MPU6050 TILT CALCULATION
// Returns angle from vertical in degrees (0 = upright boat)
// ------------------------------------------------------------
float readTiltAngle() {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

    // Convert raw accel to g
    float axg = ax / 16384.0;
    float ayg = ay / 16384.0;
    float azg = az / 16384.0;

    // Angle from vertical using atan2
    // When boat is upright: az ≈ 1g, ax ≈ 0, ay ≈ 0  → angle ≈ 0°
    // When capsized (90°):  az ≈ 0, ax or ay ≈ 1g      → angle ≈ 90°
    float tilt = atan2(sqrt(axg * axg + ayg * ayg), azg) * 180.0 / PI;
    return tilt;
}

// ------------------------------------------------------------
// SOS BUTTON STATE MACHINE
// Tracks press duration for cancel (hold 2s = cancel)
// Returns true if this is a fresh SOS press
// ------------------------------------------------------------
uint32_t buttonPressStart = 0;
bool     buttonWasDown    = false;

bool checkSosButton() {
    bool isDown = (digitalRead(SOS_BUTTON_PIN) == LOW);

    // Detect fresh press (rising edge with debounce)
    if (isDown && !buttonWasDown) {
        delay(DEBOUNCE_MS);
        isDown = (digitalRead(SOS_BUTTON_PIN) == LOW);
        if (isDown) {
            buttonPressStart = millis();
            buttonWasDown = true;
            return true;    // fresh SOS trigger
        }
    }

    // Check if button held 2+ seconds → cancel distress
    if (isDown && buttonWasDown && inDistress) {
        if (millis() - buttonPressStart > 2000) {
            buttonWasDown = false;
            return false;   // cancellation handled in main loop
        }
    }

    if (!isDown) {
        buttonWasDown = false;
    }

    return false;
}

// Returns true if button is being held for 2+ seconds (cancel gesture)
bool checkCancelGesture() {
    return (buttonWasDown && inDistress &&
            (millis() - buttonPressStart > 2000));
}

// ------------------------------------------------------------
// SETUP
// ------------------------------------------------------------
void setup() {
    Serial.begin(115200);
    pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    // ── OLED ─────────────────────────────────────────────────
    delay(500);
    Wire.begin(OLED_SDA, OLED_SCL);
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("[OLED] INIT FAILED");
    } else {
        oledClear();
        display.setTextSize(1);
        display.setCursor(0, 10);
        display.println("AQUA-SENTINEL");
        display.setCursor(0, 25);
        display.println("VESSEL NODE BOOT");
        display.setCursor(0, 40);
        display.print("ID: ");
        display.println(VESSEL_ID);
        oledShow();
    }
    delay(1500);

    // ── MPU6050 ──────────────────────────────────────────────
    mpu.initialize();
    if (!mpu.testConnection()) {
        Serial.println("[MPU6050] INIT FAILED");
        display.setCursor(0, 55);
        display.println("MPU ERR!");
        oledShow();
        delay(1000);
    } else {
        Serial.println("[MPU6050] ONLINE");
        // Set accelerometer range ±2g (most sensitive)
        mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2);
    }

    // ── LoRa SX1278 ──────────────────────────────────────────
    SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
    LoRa.setPins(LORA_CS, LORA_RST, LORA_IRQ);

    if (!LoRa.begin(LORA_FREQUENCY)) {
        Serial.println("[LoRa] INIT FAILED");
        display.setCursor(0, 55);
        display.println("LoRa FAIL - CHECK WIRING");
        oledShow();
        while (true) delay(1000);   // halt — nothing works without LoRa
    }

    // Long-range settings
    LoRa.setTxPower(LORA_TX_POWER);
    LoRa.setSignalBandwidth(LORA_BANDWIDTH);
    LoRa.setSpreadingFactor(LORA_SF);
    LoRa.setCodingRate4(LORA_CR);
    LoRa.enableCrc();               // reject corrupted packets

    Serial.println("[LoRa] ONLINE");

    // Boot complete screen
    oledClear();
    display.setTextSize(1);
    display.setCursor(0, 5);
    display.println("AQUA-SENTINEL READY");
    display.setCursor(0, 20);
    display.print("Vessel: ");
    display.println(VESSEL_ID);
    display.setCursor(0, 32);
    display.println("LoRa : ONLINE");
    display.setCursor(0, 44);
    display.println("MPU  : ONLINE");
    display.setCursor(0, 56);
    display.println("Awaiting events...");
    oledShow();
    delay(2000);

    // Send first heartbeat so gateway knows we're alive
    sendHeartbeat(0.0);
    lastHeartbeat = millis();
}

// ------------------------------------------------------------
// MAIN LOOP
// ------------------------------------------------------------
void loop() {
    uint32_t now = millis();

    // ── 1. Read MPU6050 tilt ─────────────────────────────────
    float tilt = readTiltAngle();

    // ── 2. Physical SOS button ───────────────────────────────
    bool freshSosPress = checkSosButton();
    if (freshSosPress && !inDistress) {
        // Immediate trigger — no countdown for manual button
        inDistress      = true;
        cancelWindowOpen = false;
        activeAlertType  = PKT_SOS_BUTTON;
        digitalWrite(LED_PIN, HIGH);
        sendPacket(PKT_SOS_BUTTON, tilt);
        lastSosSend = now;
        showDistressActive("MANUAL SOS BTN");
        Serial.println("[ALERT] SOS BUTTON PRESSED");
    }

    // ── 3. MPU6050 capsize detection (3-layer) ────────────────
    if (!inDistress) {
        if (tilt >= CAPSIZE_THRESHOLD) {
            if (capsizeStartTime == 0) {
                // First frame of tilt — start timer
                capsizeStartTime = now;
                capsizeSustained = false;
            } else if (!capsizeSustained &&
                       (now - capsizeStartTime >= CAPSIZE_CONFIRM_MS)) {
                // Tilt persisted for CAPSIZE_CONFIRM_MS — open cancel window
                capsizeSustained = true;
                cancelWindowOpen = true;
                cancelWindowStart = now;
                Serial.println("[MPU] CAPSIZE THRESHOLD SUSTAINED - CANCEL WINDOW OPEN");
            }
        } else {
            // Tilt recovered — reset
            capsizeStartTime = 0;
            capsizeSustained = false;
            if (cancelWindowOpen) {
                // Boat righted itself during cancel window — auto-cancel
                cancelWindowOpen = false;
                Serial.println("[MPU] Tilt recovered, auto-cancel");
            }
        }

        // Cancel window countdown on OLED
        if (cancelWindowOpen) {
            uint32_t elapsed  = now - cancelWindowStart;
            uint32_t remaining = (elapsed < CANCEL_WINDOW)
                                 ? (CANCEL_WINDOW - elapsed) : 0;

            // Button press during window = user cancels
            if (freshSosPress) {
                cancelWindowOpen = false;
                capsizeStartTime = 0;
                capsizeSustained = false;
                Serial.println("[CANCEL] User cancelled capsize alert");
                showCancelled();
            } else if (remaining == 0) {
                // Window expired without cancel — send alert
                cancelWindowOpen = false;
                inDistress       = true;
                activeAlertType  = PKT_SOS_CAPSIZE;
                digitalWrite(LED_PIN, HIGH);
                sendPacket(PKT_SOS_CAPSIZE, tilt);
                lastSosSend = now;
                showDistressActive("CAPSIZE SENSOR");
                Serial.println("[ALERT] CAPSIZE CONFIRMED - SOS SENT");
            } else {
                showCancelCountdown(remaining);
            }
        }
    }

    // ── 4. Active distress — repeat SOS every 5 seconds ──────
    if (inDistress) {
        // Check for cancel gesture (hold button 2s)
        if (checkCancelGesture()) {
            inDistress      = false;
            cancelWindowOpen = false;
            activeAlertType  = "";
            capsizeStartTime = 0;
            capsizeSustained = false;
            digitalWrite(LED_PIN, LOW);
            sendCancel();
            showCancelled();
            Serial.println("[CANCEL] Distress cancelled by user hold");
        } else {
            // Repeat SOS
            if (now - lastSosSend >= SOS_REPEAT_INTERVAL) {
                sendPacket(activeAlertType.c_str(), tilt);
                lastSosSend = now;
                Serial.println("[TX] SOS repeated");
            }
            showDistressActive(activeAlertType.c_str());
        }
    }

    // ── 5. Normal status display (when not in any alert state)
    if (!inDistress && !cancelWindowOpen) {
        showStatusScreen(tilt, true);
    }

    // ── 6. Heartbeat (every 30 seconds when not in distress) ──
    if (!inDistress && (now - lastHeartbeat >= HEARTBEAT_INTERVAL)) {
        sendHeartbeat(tilt);
        lastHeartbeat = now;
        Serial.print("[HB] Tilt=");
        Serial.print(tilt, 1);
        Serial.println("deg");
    }

    // ── 7. Listen for incoming packets (ACK from gateway) ─────
    int pktSize = LoRa.parsePacket();
    if (pktSize > 0) {
        String incoming = "";
        while (LoRa.available()) {
            incoming += (char)LoRa.read();
        }
        Serial.print("[RX] ");
        Serial.println(incoming);

        // Parse ACK
        StaticJsonDocument<128> ack;
        if (!deserializeJson(ack, incoming)) {
            const char* ackType = ack["type"] | "";
            const char* ackId   = ack["id"]   | "";

            // ACK addressed to this vessel
            if (strcmp(ackId, VESSEL_ID) == 0 &&
                strcmp(ackType, "ACK") == 0) {
                // Gateway acknowledged — stop repeating
                inDistress = false;
                digitalWrite(LED_PIN, LOW);
                activeAlertType = "";

                oledClear();
                display.setTextSize(1);
                display.setCursor(0, 10);
                display.println("GATEWAY ACK RECEIVED");
                display.setCursor(0, 25);
                display.println("Rescue team notified.");
                display.setCursor(0, 40);
                display.println("Stay calm. Help coming.");
                oledShow();
                delay(4000);
                Serial.println("[ACK] Rescue confirmed by gateway");
            }
        }
    }

    delay(50);   // small yield — keeps loop responsive
}
