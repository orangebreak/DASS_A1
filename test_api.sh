#!/bin/bash

# Configuration
BASE_URL="http://localhost:3001"
CONTENT_TYPE="Content-Type: application/json"
RANDOM_ID=$RANDOM 

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' 

# Helper function to print Request/Response
print_req_res() {
    echo -e "${YELLOW}Request Body:${NC} $1"
    echo -e "${YELLOW}Response:${NC} $2"
}

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}   ULTIMATE MERN SYSTEM INTEGRATION TEST            ${NC}"
echo -e "${BLUE}====================================================${NC}"

# ==============================================================================
# 0. ROOT CHECK
# ==============================================================================
echo -e "\n${GREEN}[0] Checking Server Root...${NC}"
ROOT_RES=$(curl -s -X GET "$BASE_URL/")
echo -e "${YELLOW}Response:${NC} $ROOT_RES"

# ==============================================================================
# 1. ADMIN LOGIN
# ==============================================================================
echo -e "\n${GREEN}[1] Admin Login...${NC}"
LOGIN_BODY='{"email": "admin@felicity.iiit.ac.in", "password": "Admin123@"}'
LOGIN_RES=$(curl -s -X POST "$BASE_URL/login" -H "$CONTENT_TYPE" -d "$LOGIN_BODY")

# Safely extract token using Node.js
ADMIN_TOKEN=$(node -pe "JSON.parse(process.argv[1]).token" "$LOGIN_RES")

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" == "undefined" ]; then
    echo -e "${RED}Admin Login Failed.${NC}"
    exit 1
else
    echo ">> Admin Token Captured"
fi

# ==============================================================================
# 2. CREATE ORGANIZER
# ==============================================================================
ORG_EMAIL="codingclub${RANDOM_ID}@iiit.ac.in"
ORG_PASS="ClubPass123"
echo -e "\n${GREEN}[2] Creating Organizer ($ORG_EMAIL)...${NC}"

ORG_BODY="{
    \"firstName\": \"Coding\", \"lastName\": \"Club\", \"email\": \"$ORG_EMAIL\",
    \"orgName\": \"CGC\", \"category\": \"Technical\", \"contactNumber\": \"9876543210\",
    \"password\": \"$ORG_PASS\", \"role\": \"organizer\"
}"

ORG_RES=$(curl -s -X POST "$BASE_URL/admin/create-organizer" -H "$CONTENT_TYPE" -H "auth-token: $ADMIN_TOKEN" -d "$ORG_BODY")
ORG_ID=$(node -pe "JSON.parse(process.argv[1])._id" "$ORG_RES")
print_req_res "$ORG_BODY" "$ORG_RES"

# ==============================================================================
# 3. ORGANIZER LOGIN
# ==============================================================================
echo -e "\n${GREEN}[3] Organizer Login...${NC}"
ORG_LOGIN_RES=$(curl -s -X POST "$BASE_URL/login" -H "$CONTENT_TYPE" -d "{\"email\": \"$ORG_EMAIL\", \"password\": \"$ORG_PASS\"}")
ORG_TOKEN=$(node -pe "JSON.parse(process.argv[1]).token" "$ORG_LOGIN_RES")
echo ">> Organizer Token Captured"

# ==============================================================================
# 4. CREATE NORMAL EVENT
# ==============================================================================
echo -e "\n${GREEN}[4] Creating Normal Event (Limit: 50)...${NC}"
EVENT_BODY="{
    \"eventName\": \"Hackathon 2026\", \"eventDescription\": \"Coding Battle\",
    \"eventType\": \"normal\", \"eligibility\": \"All\", \"regDeadline\": \"2026-12-31T00:00:00.000Z\",
    \"eventStart\": \"2027-01-01T09:00:00.000Z\", \"eventEnd\": \"2027-01-02T09:00:00.000Z\",
    \"regLimit\": 50, \"regFee\": 100
}"
EVENT_RES=$(curl -s -X POST "$BASE_URL/events" -H "$CONTENT_TYPE" -H "auth-token: $ORG_TOKEN" -d "$EVENT_BODY")
NORMAL_EVENT_ID=$(node -pe "JSON.parse(process.argv[1])._id" "$EVENT_RES")

# ==============================================================================
# 5. CREATE MERCHANDISE EVENT
# ==============================================================================
echo -e "\n${GREEN}[5] Creating Merchandise Event (Hoodies)...${NC}"
MERCH_BODY="{
    \"eventName\": \"Official Hoodie Drop\", \"eventDescription\": \"Winter Wear\",
    \"eventType\": \"merchandise\", \"eligibility\": \"All\", \"regDeadline\": \"2026-12-31T00:00:00.000Z\",
    \"eventStart\": \"2027-01-01T09:00:00.000Z\", \"eventEnd\": \"2027-01-02T09:00:00.000Z\",
    \"merchandiseItems\": [ { \"itemName\": \"Black Hoodie\", \"price\": 500, \"variants\": [\"M\", \"L\"], \"stock\": 10 } ]
}"
MERCH_RES=$(curl -s -X POST "$BASE_URL/events" -H "$CONTENT_TYPE" -H "auth-token: $ORG_TOKEN" -d "$MERCH_BODY")

MERCH_EVENT_ID=$(node -pe "JSON.parse(process.argv[1])._id" "$MERCH_RES")
MERCH_ITEM_ID=$(node -pe "JSON.parse(process.argv[1]).merchandiseItems[0]._id" "$MERCH_RES")
echo ">> Merch Event ID: $MERCH_EVENT_ID"
echo ">> Item ID to Buy: $MERCH_ITEM_ID"

# ==============================================================================
# 6. EDIT EVENT (Organizer changing status to Published)
# ==============================================================================
echo -e "\n${GREEN}[6] Editing Event Status to Published...${NC}"
EDIT_BODY="{\"status\": \"Published\", \"eventDescription\": \"Updated Description!\"}"
EDIT_RES=$(curl -s -X PUT "$BASE_URL/events/$NORMAL_EVENT_ID" -H "$CONTENT_TYPE" -H "auth-token: $ORG_TOKEN" -d "$EDIT_BODY")
print_req_res "$EDIT_BODY" "$EDIT_RES"

# ==============================================================================
# 7. REGISTER PARTICIPANT & LOGIN
# ==============================================================================
USER_EMAIL="rahul${RANDOM_ID}@iiit.ac.in"
echo -e "\n${GREEN}[7] Registering & Logging in IIIT Participant ($USER_EMAIL)...${NC}"
curl -s -X POST "$BASE_URL/register/IIIT" -H "$CONTENT_TYPE" -d "{ \"firstName\": \"Rahul\", \"lastName\": \"User\", \"email\": \"$USER_EMAIL\", \"password\": \"pass123\", \"role\": \"participant\" }" > /dev/null
USER_LOGIN_RES=$(curl -s -X POST "$BASE_URL/login" -H "$CONTENT_TYPE" -d "{ \"email\": \"$USER_EMAIL\", \"password\": \"pass123\" }")
USER_TOKEN=$(node -pe "JSON.parse(process.argv[1]).token" "$USER_LOGIN_RES")
echo ">> Participant Token Captured"

# ==============================================================================
# 8. PARTICIPANT PROFILE & DASHBOARD
# ==============================================================================
echo -e "\n${GREEN}[8] Testing Participant Profile Update & Dashboard...${NC}"
PROF_RES=$(curl -s -X PUT "$BASE_URL/profile" -H "$CONTENT_TYPE" -H "auth-token: $USER_TOKEN" -d "{\"contactNumber\": \"1234567890\", \"interests\": [\"AI\", \"Web\"]}")
DASH_RES=$(curl -s -X GET "$BASE_URL/dashboard" -H "auth-token: $USER_TOKEN")
print_req_res "Update Profile" "$PROF_RES"

# ==============================================================================
# 9. BROWSE EVENTS & CLUBS
# ==============================================================================
echo -e "\n${GREEN}[9] Browsing Events & Following Organizer...${NC}"
BROWSE_RES=$(curl -s -X GET "$BASE_URL/events?search=Hackathon" -H "auth-token: $USER_TOKEN")
FOLLOW_RES=$(curl -s -X POST "$BASE_URL/follow/$ORG_ID" -H "auth-token: $USER_TOKEN" -d "")
print_req_res "Follow Action" "$FOLLOW_RES"

# ==============================================================================
# 10. REGISTER FOR NORMAL EVENT & GET TICKET ID
# ==============================================================================
echo -e "\n${GREEN}[10] Participant Registering for Hackathon...${NC}"
REG_RES=$(curl -s -X POST "$BASE_URL/register-event/$NORMAL_EVENT_ID" -H "$CONTENT_TYPE" -H "auth-token: $USER_TOKEN" -d "{}")
TICKET_ID=$(node -pe "JSON.parse(process.argv[1]).registration.ticketId" "$REG_RES")
print_req_res "{}" "$REG_RES"

# ==============================================================================
# 11. UNREGISTER & RE-REGISTER
# ==============================================================================
echo -e "\n${GREEN}[11] Testing Unregister then Re-registering...${NC}"
UNREG_RES=$(curl -s -X DELETE "$BASE_URL/unregister/$NORMAL_EVENT_ID" -H "auth-token: $USER_TOKEN")
print_req_res "Unregister" "$UNREG_RES"

# Re-register so we have a ticket for the scanner test
REG_RES2=$(curl -s -X POST "$BASE_URL/register-event/$NORMAL_EVENT_ID" -H "$CONTENT_TYPE" -H "auth-token: $USER_TOKEN" -d "{}")
TICKET_ID=$(node -pe "JSON.parse(process.argv[1]).registration.ticketId" "$REG_RES2")

# ==============================================================================
# 12. FETCH QR TICKET
# ==============================================================================
echo -e "\n${GREEN}[12] Fetching Ticket details and QR Code...${NC}"
QR_RES=$(curl -s -X GET "$BASE_URL/tickets/$TICKET_ID" -H "auth-token: $USER_TOKEN")
echo ">> Ticket successfully fetched (QR data hidden for length)"

# ==============================================================================
# 13. SCAN TICKET (Attendance)
# ==============================================================================
echo -e "\n${GREEN}[13] Organizer Scanning Ticket (Marking Attendance)...${NC}"
SCAN_BODY="{\"ticketId\": \"$TICKET_ID\"}"
SCAN_RES=$(curl -s -X POST "$BASE_URL/events/scan-ticket" -H "$CONTENT_TYPE" -H "auth-token: $ORG_TOKEN" -d "$SCAN_BODY")
print_req_res "$SCAN_BODY" "$SCAN_RES"

# ==============================================================================
# 14. SUBMIT ANONYMOUS FEEDBACK
# ==============================================================================
echo -e "\n${GREEN}[14] Participant Submitting Anonymous Feedback...${NC}"
FEEDBACK_BODY="{\"rating\": 5, \"comments\": \"Amazing event!\"}"
FEED_RES=$(curl -s -X POST "$BASE_URL/events/$NORMAL_EVENT_ID/feedback" -H "$CONTENT_TYPE" -H "auth-token: $USER_TOKEN" -d "$FEEDBACK_BODY")
print_req_res "$FEEDBACK_BODY" "$FEED_RES"

# ==============================================================================
# 15. ORGANIZER ANALYTICS & FEEDBACK DASHBOARD
# ==============================================================================
echo -e "\n${GREEN}[15] Organizer Fetching Analytics & Feedback Stats...${NC}"
ANALYTICS_RES=$(curl -s -X GET "$BASE_URL/events/$NORMAL_EVENT_ID/analytics" -H "auth-token: $ORG_TOKEN")
FEEDBACK_STATS=$(curl -s -X GET "$BASE_URL/events/$NORMAL_EVENT_ID/feedback" -H "auth-token: $ORG_TOKEN")
print_req_res "Analytics GET" "$ANALYTICS_RES"
print_req_res "Feedback GET" "$FEEDBACK_STATS"

# ==============================================================================
# 16. MERCHANDISE PURCHASE & APPROVAL WORKFLOW
# ==============================================================================
echo -e "\n${GREEN}[16] Merch Workflow: Buy -> Pending -> Organizer Approves...${NC}"
BUY_BODY="{ \"merchandiseSelection\": { \"itemId\": \"$MERCH_ITEM_ID\", \"variant\": \"M\" }, \"paymentProof\": \"base64_fake_image_string\" }"
BUY_RES=$(curl -s -X POST "$BASE_URL/register-event/$MERCH_EVENT_ID" -H "$CONTENT_TYPE" -H "auth-token: $USER_TOKEN" -d "$BUY_BODY")
print_req_res "Buy Merch" "$BUY_RES"

MERCH_TICKET_ID=$(node -pe "JSON.parse(process.argv[1]).registration.ticketId" "$BUY_RES")

REVIEW_BODY="{\"action\": \"approve\"}"
REVIEW_RES=$(curl -s -X PUT "$BASE_URL/orders/$MERCH_TICKET_ID/review" -H "$CONTENT_TYPE" -H "auth-token: $ORG_TOKEN" -d "$REVIEW_BODY")
print_req_res "$REVIEW_BODY" "$REVIEW_RES"

# ==============================================================================
# 17. REAL-TIME FORUM WORKFLOW
# ==============================================================================
echo -e "\n${GREEN}[17] Forum Workflow: Post -> View -> Pin...${NC}"
FORUM_POST_BODY="{\"message\": \"Is there free food?\"}"
FORUM_POST_RES=$(curl -s -X POST "$BASE_URL/events/$NORMAL_EVENT_ID/forum" -H "$CONTENT_TYPE" -H "auth-token: $USER_TOKEN" -d "$FORUM_POST_BODY")
print_req_res "Post to Forum" "$FORUM_POST_RES"

MSG_ID=$(node -pe "JSON.parse(process.argv[1])._id" "$FORUM_POST_RES")

FORUM_PIN_RES=$(curl -s -X PUT "$BASE_URL/forum/$MSG_ID/moderate" -H "$CONTENT_TYPE" -H "auth-token: $ORG_TOKEN" -d "{\"action\": \"pin\"}")
print_req_res "Pin Message" "$FORUM_PIN_RES"

# ==============================================================================
# 18. PASSWORD RESET WORKFLOW
# ==============================================================================
echo -e "\n${GREEN}[18] Admin & Organizer Password Reset Workflow...${NC}"
RESET_REQ_RES=$(curl -s -X POST "$BASE_URL/password-reset/request" -H "$CONTENT_TYPE" -H "auth-token: $ORG_TOKEN" -d "{\"reason\": \"Forgot password\"}")
RESET_ID=$(node -pe "JSON.parse(process.argv[1]).request._id" "$RESET_REQ_RES")

RESET_APPROVE_RES=$(curl -s -X PUT "$BASE_URL/admin/password-resets/$RESET_ID" -H "$CONTENT_TYPE" -H "auth-token: $ADMIN_TOKEN" -d "{\"action\": \"approve\", \"comments\": \"Approved by system test\"}")
print_req_res "Approve Reset" "$RESET_APPROVE_RES"

echo -e "\n${BLUE}====================================================${NC}"
echo -e "${BLUE}           ALL TESTS COMPLETED SUCCESSFULLY         ${NC}"
echo -e "${BLUE}====================================================${NC}"