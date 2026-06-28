// ============================================================
//  AQUA-SENTINEL — ANCHORED BUOY NODE
//  Hardware : ESP32 + LoRa SX1278
//  Role     : Anchored ocean relay buoy. Listens for vessel
//             or peer buoy alerts, adds hop data, and routes
//             them closer to the shore.
// ============================================================

#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>

#define BUOY_ID          "BN-001"     // Unique Anchored Buoy Identifier
#define BUOY_LAT         "13.1254"    // Hardcoded static buoy coordinates
#define BUOY_LNG         "80.3421"

// Pin Configurations (Matching your 38-pin ESP32 scheme)
#define LORA_SCK         18
#define LORA_MISO        19
#define LORA_MOSI        23
#define LORA_CS          5
#define LORA_RST         14
#define LORA_IRQ         2

// Radio Frequency Settings
#define LORA_FREQUENCY   433E6        // Must match your Vessel Node (433 MHz)
#define LORA_TX_POWER    20           // Boosted to maximum 20dBm for long range
#define LORA_BANDWIDTH   125E3
#define LORA_SF          10
#define LORA_CR          5

// Deduplication tracking variables
String lastVesselAlertId = "";
uint16_t lastProcessedSeq = 0;
uint32_t duplicateCacheTimer = 0;

void setup() {
    Serial.begin(115200);
    Serial.println("[BUOY] Initializing Anchored Ocean Node...");

    SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
    LoRa.setPins(LORA_CS, LORA_RST, LORA_IRQ);

    if (!LoRa.begin(LORA_FREQUENCY)) {
        Serial.println("[BUOY LoRa] Init failed!");
        while (true);
    }

    LoRa.setTxPower(LORA_TX_POWER);
    LoRa.setSignalBandwidth(LORA_BANDWIDTH);
    LoRa.setSpreadingFactor(LORA_SF);
    LoRa.setCodingRate4(LORA_CR);
    LoRa.enableCrc();

    Serial.println("[BUOY READY] Standing by to relay mesh packets...");
}

void loop() {
    int packetSize = LoRa.parsePacket();
    if (packetSize > 0) {
        String incoming = "";
        while (LoRa.available()) {
            incoming += (char)LoRa.read();
        }

        // Cache cleanup to allow handling fresh alerts after 8 seconds
        if (millis() - duplicateCacheTimer > 8000) {
            lastVesselAlertId = "";
            lastProcessedSeq = 0;
        }

        StaticJsonDocument<384> doc;
        DeserializationError error = deserializeJson(doc, incoming);

        if (!error) {
            const char* type = doc["type"] | "";
            const char* vesselId = doc["id"] | "";
            uint16_t seq = doc["seq"] | 0;

            // Target alerts (SOS button or Capsize events) or Cancel cleanups
            if (strcmp(type, "SOS_BTN") == 0 || strcmp(type, "SOS_CAP") == 0 || strcmp(type, "CANCEL") == 0) {
                
                // Deduplication guard: verify if this exact packet was just relayed
                if (String(vesselId) == lastVesselAlertId && seq == lastProcessedSeq) {
                    Serial.println("[BUOY] Dropping duplicated network echo packet.");
                    return; 
                }

                // Update deduplication trackers
                lastVesselAlertId = String(vesselId);
                lastProcessedSeq = seq;
                duplicateCacheTimer = millis();

                Serial.print("[RELAYING FROM MESH] Found alert payload: ");
                Serial.println(incoming);

                // Increment dynamic network hops
                int currentHops = doc["hops"] | 0;
                doc["hops"] = currentHops + 1;

                // Append the last node tracking chain list array
                JsonArray routeLog;
                if (!doc.containsKey("route")) {
                    routeLog = doc.createNestedArray("route");
                } else {
                    routeLog = doc["route"].as<JsonArray>();
                }
                routeLog.add(BUOY_ID);

                // Add relay infrastructure diagnostics data
                doc["relay_id"] = BUOY_ID;
                doc["relay_lat"] = serialized(String(BUOY_LAT));
                doc["relay_lng"] = serialized(String(BUOY_LNG));

                // Serialize updated nested structures
                String meshOutputPayload;
                serializeJson(doc, meshOutputPayload);

                // Anti-collision airtime delay offset
                delay(random(200, 600));

                // Forward onwards toward Gateway target destination
                LoRa.beginPacket();
                LoRa.print(meshOutputPayload);
                LoRa.endPacket();

                Serial.println("[RETRANSMITTED] Payload packet forwarded cleanly.");
            }
        }
    }
}