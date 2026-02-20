#!/bin/bash

# WareTrack-Pro v2.1.1 Verification Script
# This script verifies all updates are properly applied

echo "🔍 WareTrack-Pro v2.1.1 Verification"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to check status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $1"
        ((FAILED++))
    fi
}

echo "📦 Checking Package Versions..."
echo "--------------------------------"

# Check backend version
BACKEND_VERSION=$(grep '"version"' backend/package.json | head -1 | cut -d'"' -f4)
if [ "$BACKEND_VERSION" = "2.1.1" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Backend version is 2.1.1"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Backend version is $BACKEND_VERSION (expected 2.1.1)"
    ((FAILED++))
fi

# Check frontend version
FRONTEND_VERSION=$(grep '"version"' frontend/package.json | head -1 | cut -d'"' -f4)
if [ "$FRONTEND_VERSION" = "2.1.1" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Frontend version is 2.1.1"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Frontend version is $FRONTEND_VERSION (expected 2.1.1)"
    ((FAILED++))
fi

echo ""
echo "🔧 Checking File Existence..."
echo "--------------------------------"

# Check if reportsController exists
if [ -f "backend/src/controllers/reportsController.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC}: reportsController.ts exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: reportsController.ts not found"
    ((FAILED++))
fi

# Check if CHANGELOG exists
if [ -f "CHANGELOG.md" ]; then
    echo -e "${GREEN}✓ PASS${NC}: CHANGELOG.md exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: CHANGELOG.md not found"
    ((FAILED++))
fi

# Check if DEPLOYMENT guide exists
if [ -f "DEPLOYMENT.md" ]; then
    echo -e "${GREEN}✓ PASS${NC}: DEPLOYMENT.md exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: DEPLOYMENT.md not found"
    ((FAILED++))
fi

# Check if UPDATE_SUMMARY exists
if [ -f "UPDATE_SUMMARY.md" ]; then
    echo -e "${GREEN}✓ PASS${NC}: UPDATE_SUMMARY.md exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: UPDATE_SUMMARY.md not found"
    ((FAILED++))
fi

echo ""
echo "🏗️  Building Backend..."
echo "--------------------------------"

cd backend
npm run build > /dev/null 2>&1
check_status "Backend builds successfully"
cd ..

echo ""
echo "🎨 Building Frontend..."
echo "--------------------------------"

cd frontend
npm run build > /dev/null 2>&1
check_status "Frontend builds successfully"
cd ..

echo ""
echo "📚 Checking Documentation..."
echo "--------------------------------"

# Check Swagger version
SWAGGER_VERSION=$(grep '"version":' backend/src/config/swagger.ts | head -1 | cut -d'"' -f4)
if [ "$SWAGGER_VERSION" = "2.1.0" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Swagger version is 2.1.0"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARN${NC}: Swagger version is $SWAGGER_VERSION (expected 2.1.0)"
fi

# Check Postman collection version
POSTMAN_VERSION=$(grep '"version":' WareTrack-Pro-API.postman_collection.json | head -1 | cut -d'"' -f4)
if [ "$POSTMAN_VERSION" = "2.1.1" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Postman collection version is 2.1.1"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Postman collection version is $POSTMAN_VERSION (expected 2.1.1)"
    ((FAILED++))
fi

# Check if reports routes have Swagger docs
if grep -q "@swagger" backend/src/routes/reports.ts; then
    echo -e "${GREEN}✓ PASS${NC}: Reports routes have Swagger documentation"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Reports routes missing Swagger documentation"
    ((FAILED++))
fi

echo ""
echo "🐳 Checking Docker Configuration..."
echo "--------------------------------"

# Check if Dockerfiles exist
if [ -f "backend/Dockerfile" ] && [ -f "frontend/Dockerfile" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Docker files exist"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Docker files missing"
    ((FAILED++))
fi

# Check if docker-compose files exist
if [ -f "docker-compose.yml" ] && [ -f "docker-compose.prod.yml" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Docker Compose files exist"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Docker Compose files missing"
    ((FAILED++))
fi

echo ""
echo "📊 Verification Summary"
echo "===================================="
echo -e "Total Checks: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review and fix issues.${NC}"
    exit 1
fi
