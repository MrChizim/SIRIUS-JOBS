#!/bin/bash

echo "🔍 COMPREHENSIVE TYPESCRIPT ERROR DIAGNOSTIC"
echo "=============================================="
echo ""

echo "1️⃣ WEBSOCKET SERVICE ISSUES:"
echo "----------------------------"
if [ -f services/websocket.service.ts ]; then
    echo "Found websocket.service.ts"
    echo "❌ session.isExpired() calls:"
    grep -n "session\.isExpired()" services/websocket.service.ts | head -5
    echo "❌ session.activate() calls:"
    grep -n "session\.activate()" services/websocket.service.ts | head -5
else
    echo "✅ No websocket.service.ts"
fi
echo ""

echo "2️⃣ CONTROLLER FILES WITH TYPE ISSUES:"
echo "--------------------------------------"
echo "Total controllers with 'req: Request':"
grep -r "req: Request" controllers/*.ts 2>/dev/null | wc -l
echo "Total controllers with 'req: AuthRequest':"
grep -r "req: AuthRequest" controllers/*.ts 2>/dev/null | wc -l
echo ""

echo "3️⃣ MIDDLEWARE FILES WITH TYPE ISSUES:"
echo "--------------------------------------"
echo "Files in middleware:"
ls middleware/*.ts 2>/dev/null | wc -l
echo "Middleware with AuthRequest:"
grep -r "req: AuthRequest" middleware/*.ts 2>/dev/null | wc -l
echo ""

echo "4️⃣ ROUTE FILES WITH TYPE ISSUES:"
echo "----------------------------------"
echo "Total routes:"
ls routes/*.ts 2>/dev/null | wc -l
echo "Routes with type issues:"
grep -r "req: Request\|req: AuthRequest" routes/*.ts 2>/dev/null | wc -l
echo ""

echo "5️⃣ SERVICE FILES WITH TYPE ISSUES:"
echo "-----------------------------------"
echo "Services with Request types:"
grep -r "req: Request\|req: AuthRequest" services/*.ts 2>/dev/null | wc -l
echo ""

echo "=============================================="
echo "📊 SUMMARY"
echo "=============================================="
echo "This diagnostic complete. Review the numbers above."
echo "If you see 0s, that category is already fixed!"
echo "If you see numbers, we need to fix those files."
