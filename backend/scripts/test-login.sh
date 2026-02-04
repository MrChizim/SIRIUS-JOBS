#!/bin/bash

BASE_URL="http://localhost:4000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Testing Sirius Jobs Login System"
echo "=========================================="
echo ""

# Test 1: Worker Login
echo "Test 1: Worker Login"
echo "--------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"worker@test.com","password":"Test1234"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo -e "${GREEN}✓ Worker login successful${NC}"
  echo "Response: $RESPONSE" | head -c 200
  echo "..."
else
  echo -e "${RED}✗ Worker login failed${NC}"
  echo "Response: $RESPONSE"
fi
echo ""
echo ""

# Test 2: Employer Login
echo "Test 2: Employer Login"
echo "--------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"employer@test.com","password":"Test1234"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo -e "${GREEN}✓ Employer login successful${NC}"
  echo "Response: $RESPONSE" | head -c 200
  echo "..."
else
  echo -e "${RED}✗ Employer login failed${NC}"
  echo "Response: $RESPONSE"
fi
echo ""
echo ""

# Test 3: Client Login
echo "Test 3: Client Login"
echo "--------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"client@test.com","password":"Test1234"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo -e "${GREEN}✓ Client login successful${NC}"
  echo "Response: $RESPONSE" | head -c 200
  echo "..."
else
  echo -e "${RED}✗ Client login failed${NC}"
  echo "Response: $RESPONSE"
fi
echo ""
echo ""

# Test 4: Doctor Login
echo "Test 4: Doctor Login"
echo "--------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@test.com","password":"Test1234"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo -e "${GREEN}✓ Doctor login successful${NC}"
  echo "Response: $RESPONSE" | head -c 200
  echo "..."
else
  echo -e "${RED}✗ Doctor login failed${NC}"
  echo "Response: $RESPONSE"
fi
echo ""
echo ""

# Test 5: Lawyer Login
echo "Test 5: Lawyer Login"
echo "--------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"lawyer@test.com","password":"Test1234"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo -e "${GREEN}✓ Lawyer login successful${NC}"
  echo "Response: $RESPONSE" | head -c 200
  echo "..."
else
  echo -e "${RED}✗ Lawyer login failed${NC}"
  echo "Response: $RESPONSE"
fi
echo ""
echo ""

# Test 6: Dual Role Login
echo "Test 6: Dual Role Login (Worker + Employer)"
echo "--------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"dual@test.com","password":"Test1234"}')

if echo "$RESPONSE" | grep -q '"token"'; then
  echo -e "${GREEN}✓ Dual role login successful${NC}"
  if echo "$RESPONSE" | grep -q '"ARTISAN"' && echo "$RESPONSE" | grep -q '"EMPLOYER"'; then
    echo -e "${GREEN}✓ Both ARTISAN and EMPLOYER roles present${NC}"
  fi
  echo "Response: $RESPONSE" | head -c 200
  echo "..."
else
  echo -e "${RED}✗ Dual role login failed${NC}"
  echo "Response: $RESPONSE"
fi
echo ""
echo ""

# Test 7: Invalid Credentials
echo "Test 7: Invalid Credentials"
echo "--------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"worker@test.com","password":"wrongpassword"}')

if echo "$RESPONSE" | grep -q '"Invalid credentials"'; then
  echo -e "${GREEN}✓ Invalid credentials properly rejected${NC}"
  echo "Response: $RESPONSE"
else
  echo -e "${RED}✗ Invalid credentials test failed${NC}"
  echo "Response: $RESPONSE"
fi
echo ""
echo ""

# Test 8: Missing Email
echo "Test 8: Missing Email Validation"
echo "--------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"Test1234"}')

if echo "$RESPONSE" | grep -q '"errors"'; then
  echo -e "${GREEN}✓ Missing email properly validated${NC}"
  echo "Response: $RESPONSE"
else
  echo -e "${RED}✗ Missing email validation failed${NC}"
  echo "Response: $RESPONSE"
fi
echo ""
echo ""

# Test 9: Health Check
echo "Test 9: Health Check"
echo "--------------------"
RESPONSE=$(curl -s "$BASE_URL/health")

if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✓ Health check passed${NC}"
  echo "Response: $RESPONSE"
else
  echo -e "${RED}✗ Health check failed${NC}"
  echo "Response: $RESPONSE"
fi
echo ""
echo ""

echo "=========================================="
echo "Testing Complete"
echo "=========================================="
