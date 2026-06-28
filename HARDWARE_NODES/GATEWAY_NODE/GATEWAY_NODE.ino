// ============================================================
//  AQUA-SENTINEL — ELEVATED SHORE GATEWAY NODE
//  Hardware : ESP32 + LoRa SX1278 (Connected via USB to Server)
//  Role     : Catching open-water signals directly or from buoys,
//             formatting tracking strings to standard JSON, and
//             outputting to the dashboard dashboard system.
// ============================================================

#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>

// Pin Configurations (Matching your 38-pin ESP32 scheme)
#define LORA_SCK         18
#define LORA_MISO        19
#define LORA_MOSI        23
#define LORA_CS          5
#define LORA_RST         14
#define LORA_IRQ         2

#define LORA_FREQUENCY   433E6 // Must match network frequency profile
#define LORA_BANDWIDTH   125E3
#define LORA_SF          10
#define LORA_CR          5

void setup() {
    Serial.begin(115200); // Handshake with dashboard server backend engine 
    
    SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
    LoRa.setPins(LORA_CS, LORA_RST, LORA_IRQ);

    if (!LoRa.begin(LORA_FREQUENCY)) {
        Serial.println("{\"error\":\"GATEWAY_LORA_INIT_FAILED\"}");
        while (true);
    }

    LoRa.setSignalBandwidth(LORA_BANDWIDTH);
    LoRa.setSpreadingFactor(LORA_SF);
    LoRa.setCodingRate4(LORA_CR);
    LoRa.enableCrc();

    // Signal clear setup execution verification
    delay(500);
    Serial.println("{\"status\":\"GATEWAY_ONLINE\"}");
}

void loop() {
    int packetSize = LoRa.parsePacket();
    if (packetSize > 0) {
        String incoming = "";
        while (LoRa.available()) {
            incoming += (char)LoRa.read();
        }

        int hardwareRssi = LoRa.packetRssi();
        float hardwareSnr = LoRa.packetSnr();

        StaticJsonDocument<512> serverDoc;
        DeserializationError error = deserializeJson(serverDoc, incoming);

        if (!error) {
            // Append physical network infrastructure data metrics
            serverDoc["gateway_rssi"] = hardwareRssi;
            serverDoc["gateway_snr"] = hardwareSnr;
            
            // If the packet didn't travel via an intermediate buoy, default hops parameters
            if (!serverDoc.containsKey("hops")) {
                serverDoc["hops"] = 0;
            }

            // Flush out full raw unified packet directly down serial pipeline to dashboard
            serializeJson(serverDoc, Serial);
            Serial.println(); // Critical carriage break delimiter line

            // ── OPTIONAL OUTBOUND ACK PIPELINE ─────────────────────
            // When an alert packet lands, broadcast an active ACK confirmation
            // token back out down the mesh lines so that the specific target vessel
            // knows it can immediately halt its 5s audio/visual alarm loops.
            const char* type = serverDoc["type"] | "";
            const char* vesselId = serverDoc["id"] | "";
            
            if (strcmp(type, "SOS_BTN") == 0 || strcmp(type, "SOS_CAP") == 0) {
                delay(100); // Short turnaround clearance processing gap
                
                StaticJsonDocument<128> ackDoc;
                ackDoc["type"] = "ACK";
                ackDoc["id"] = vesselId;

                String ackPayload;
                serializeJson(ackDoc, ackPayload);

                LoRa.beginPacket();
                LoRa.print(ackPayload);
                LoRa.endPacket();
            }
        }
    }
}