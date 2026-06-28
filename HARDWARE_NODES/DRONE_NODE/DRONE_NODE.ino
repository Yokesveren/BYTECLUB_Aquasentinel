// ============================================================
//  AQUA-SENTINEL — AIRBORNE DRONE INTERCEPT NODE
//  Hardware : ESP32 + LoRa SX1278 + Flight Controller Link
//  Role     : Mounted on an autonomous UAV. Intercepts distress
//             telemetry from mid-air, parses coordinates, and
//             commands the flight controller to redirect.
// ============================================================

#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>

#define DRONE_ID         "DR-01"      // Dynamic Drone Identifier

// Pin Configurations (Matching your 38-pin ESP32 scheme)
#define LORA_SCK         18
#define LORA_MISO        19
#define LORA_MOSI        23
#define LORA_CS          5
#define LORA_RST         14
#define LORA_IRQ         2

// Hardware Serial 2 for Flight Controller Communication (Pixhawk / APM)
#define FC_TX_PIN        17  // Connect to Flight Controller RX
#define FC_RX_PIN        16  // Connect to Flight Controller TX

#define LORA_FREQUENCY   433E6        // Must match network profile (433 MHz)
#define LORA_BANDWIDTH   125E3
#define LORA_SF          10
#define LORA_CR          5

// Track currently targeted emergency to avoid re-triggering the same flight path
String currentTargetVessel = "";
uint16_t lastTargetSeq = 0;

void setup() {
    // Serial 0 for USB Debugging
    Serial.begin(115200);
    
    // Serial 2 for Telemetry output to the Drone Flight Controller
    Serial2.begin(57600, SERIAL_8N1, FC_RX_PIN, FC_TX_PIN); 
    
    Serial.println("[DRONE NODE] Initializing Mid-Air Intercept System...");

    SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
    LoRa.setPins(LORA_CS, LORA_RST, LORA_IRQ);

    if (!LoRa.begin(LORA_FREQUENCY)) {
        Serial.println("[DRONE LoRa] Init failed!");
        while (true);
    }

    LoRa.setSignalBandwidth(LORA_BANDWIDTH);
    LoRa.setSpreadingFactor(LORA_SF);
    LoRa.setCodingRate4(LORA_CR);
    LoRa.enableCrc();

    Serial.println("[DRONE READY] Airborne. Scanning maritime airwaves for distress markers...");
}

void loop() {
    int packetSize = LoRa.parsePacket();
    if (packetSize > 0) {
        String incoming = "";
        while (LoRa.available()) {
            incoming += (char)LoRa.read();
        }

        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, incoming);

        if (!error) {
            const char* type = doc["type"] | "";
            const char* vesselId = doc["id"] | "";
            uint16_t seq = doc["seq"] | 0;
            
            // Extract coordinates sent by the vessel or updated by the mesh
            // Handled as strings or floats depending on your exact GPS module payload structure
            float targetLat = doc["lat"] | 0.0;
            float targetLng = doc["lng"] | 0.0;

            // Target active emergency triggers
            if (strcmp(type, "SOS_BTN") == 0 || strcmp(type, "SOS_CAP") == 0) {
                
                // If we are already flying to this vessel for this specific sequence alert, ignore duplicate packets
                if (String(vesselId) == currentTargetVessel && seq == lastTargetSeq) {
                    return; 
                }

                // Lock onto new target coordinates
                currentTargetVessel = String(vesselId);
                lastTargetSeq = seq;

                Serial.println("\n========================================");
                Serial.print("[🚨 ALERT INTERCEPTED BY DRONE] Source: ");
                Serial.println(vesselId);
                Serial.print("Coordinates Extracted -> Lat: "); Serial.print(targetLat, 6);
                Serial.print(" | Lng: "); Serial.println(targetLng, 6);
                Serial.println("========================================");

                // Command the drone's flight controller over Serial2
                dispatchFlightControllerToTarget(vesselId, targetLat, targetLng);
            }
        }
    }
}

// Communicates target data directly to the drone navigation layer
void dispatchFlightControllerToTarget(String vesselId, float lat, float lng) {
    Serial.println("[NAV] Generating hardware override intercept vector...");
    
    // Formats a waypoint redirection string for your custom flight script or companion computer
    // Expected output format: GOTO,VN-001,13.0827,80.2707
    String flightCommand = "GOTO," + vesselId + "," + String(lat, 6) + "," + String(lng, 6);
    
    // Blast command straight into the telemetry port of the drone's navigation computer
    Serial2.println(flightCommand);
    Serial.print("[SERIAL2 TX -> FLIGHT CONTROLLER]: ");
    Serial.println(flightCommand);
}