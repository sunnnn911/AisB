#include <Wire.h>
#include <Adafruit_INA219.h>
#include "max6675.h"

Adafruit_INA219 ina219;

const int relayPin = 3;

// HOT MAX6675
const int hotSO = 4;
const int hotCS = 5;
const int hotSCK = 6;

// COLD MAX6675
const int coldSO = 7;
const int coldCS = 8;
const int coldSCK = 9;

MAX6675 hotThermo(hotSCK, hotCS, hotSO);
MAX6675 coldThermo(coldSCK, coldCS, coldSO);

float fanOnTemp = 40.0;
float fanOffTemp = 35.0;

bool fanState = false;

void setup() {
  Serial.begin(9600);

  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, LOW);

  if (!ina219.begin()) {
    Serial.println("INA219 ERROR");
    while (1);
  }

  delay(1000);

  Serial.println("Time_s,HotTemp_C,ColdTemp_C,DeltaT_C,Voltage_V,Current_mA,Power_mW,Fan");
}

void loop() {
  float time_s = millis() / 1000.0;

  float hotTemp = hotThermo.readCelsius();
  float coldTemp = coldThermo.readCelsius();
  float deltaT = abs(hotTemp - coldTemp);

  float busVoltage = ina219.getBusVoltage_V();
  float shuntVoltage_mV = ina219.getShuntVoltage_mV();
  float current_mA = ina219.getCurrent_mA();
  float power_mW = ina219.getPower_mW();

  float voltage_V = busVoltage + (shuntVoltage_mV / 1000.0);

  if (hotTemp >= fanOnTemp) {
    fanState = true;
  }

  if (hotTemp <= fanOffTemp) {
    fanState = false;
  }

  digitalWrite(relayPin, fanState ? HIGH : LOW);

  Serial.print(time_s);
  Serial.print(",");
  Serial.print(hotTemp);
  Serial.print(",");
  Serial.print(coldTemp);
  Serial.print(",");
  Serial.print(deltaT);
  Serial.print(",");
  Serial.print(voltage_V);
  Serial.print(",");
  Serial.print(current_mA);
  Serial.print(",");
  Serial.print(power_mW);
  Serial.print(",");
  Serial.println(fanState ? "ON" : "OFF");

  delay(1000);
}
