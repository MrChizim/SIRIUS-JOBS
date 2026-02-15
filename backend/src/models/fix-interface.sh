#!/bin/bash

# Find where the interface ends (before the closing })
# and add method signatures

# Create the method signatures to add
cat > methods.txt << 'METHODS'
  
  // Method signatures
  isExpired(): boolean;
  isActive(): boolean;
  getRemainingTime(): number;
  startSession(): void;
  extendSession(additionalHours: number, paymentReference: string): void;
  calculateExtensionCost(additionalHours: number): number;
METHODS

# Backup original
cp ConsultationSession.model.ts ConsultationSession.model.ts.backup

# Find the line with "export interface IConsultationSession" 
# and add methods before the schema definition

python3 << 'PYTHON'
with open('ConsultationSession.model.ts', 'r') as f:
    lines = f.readlines()

with open('methods.txt', 'r') as f:
    methods = f.read()

output = []
in_interface = False
methods_added = False

for i, line in enumerate(lines):
    output.append(line)
    
    # Check if we're in the interface
    if 'export interface IConsultationSession' in line:
        in_interface = True
    
    # Look for the closing of interface (before const schema definition)
    if in_interface and not methods_added:
        if i+1 < len(lines) and 'const consultationSessionSchema' in lines[i+1]:
            # Add methods before the closing }
            if line.strip() == '}':
                # Insert methods before this closing brace
                output[-1] = methods + '\n}\n'
                methods_added = True

with open('ConsultationSession.model.ts', 'w') as f:
    f.writelines(output)

print("✅ Method signatures added to interface!")
PYTHON

rm methods.txt

