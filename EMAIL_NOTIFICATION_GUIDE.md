# 📧 Email Notification Management Guide

## 🔔 How Notifications Work Now

### **Smart Duplicate Prevention**
The system now prevents duplicate email notifications using intelligent detection:

✅ **Before Sending Email:**
- Checks if an **unread** notification with the same content exists
- If unread notification found → **No email sent**
- If no unread notification → Email sent + notification created

✅ **When You Read a Notification:**
- Notification marked as read in database
- Next inventory check can create new alert if issue persists
- Prevents email spam while keeping you informed

---

## 📊 **Low Stock Alert Behavior**

### **Scenario 1: First Alert**
1. System detects low stock (e.g., Manila Folders: 3/20)
2. Creates notification in database
3. Sends email to admin
4. **Status:** Unread notification exists

### **Scenario 2: Hourly Check (Unread)**
1. System runs inventory check again
2. Finds same low stock item
3. **Checks:** Unread notification exists? ✅ Yes
4. **Action:** Skip - No new email sent
5. **Log:** "Skipping duplicate low stock alert for Manila Folders - unread alert exists"

### **Scenario 3: After Reading**
1. Admin reads notification in system
2. **Status:** Notification marked as read
3. Next inventory check (if still low stock):
   - No unread notification found
   - Creates new alert + sends email
   - Reminds admin issue still exists

### **Scenario 4: Stock Replenished**
1. Admin restocks item (quantity > minQuantity)
2. Next inventory check:
   - Item not in low stock list
   - No notification created
   - No email sent

---

## ⚙️ **System Configuration**

### **Check Frequency:**
- **Previous:** Every 1 hour
- **New:** Every 6 hours
- **Reason:** Reduces alert frequency while maintaining awareness

### **Alert Types Covered:**
1. ✅ Low Stock Alerts (individual items)
2. ✅ Multiple Low Stock Items (system alert)
3. ✅ Out of Stock Alerts
4. ✅ System Errors

---

## 🎯 **Best Practices for Admins**

### **To Stop Receiving Emails:**
1. **Read the notification** in the system (bell icon)
2. **Restock the items** to above minimum quantity
3. System will stop alerting once stock is sufficient

### **To Continue Monitoring:**
1. Keep notifications unread if you want reminders
2. System won't send duplicate emails for unread alerts
3. Read notification only after taking action

### **To Manage Alerts:**
1. Go to **Notifications** page
2. Click notification to mark as read
3. Use "Mark All as Read" to clear all at once
4. Delete old notifications to keep inbox clean

---

## 🔧 **Technical Details**

### **Duplicate Detection Logic:**
```typescript
// Check for existing unread alert
const existingAlert = await prisma.notification.findFirst({
  where: {
    type: 'LOW_STOCK',
    message: { contains: itemName },
    read: false
  }
});

// Skip if unread alert exists
if (existingAlert) {
  console.log('Skipping duplicate - unread alert exists');
  return [];
}
```

### **Email Sending Conditions:**
- ✅ No unread notification exists
- ✅ User has email notifications enabled
- ✅ Notification type matches user preferences
- ✅ User status is ACTIVE

---

## 📈 **Notification Lifecycle**

```
Low Stock Detected
       ↓
Check for Unread Alert
       ↓
   ┌───────┴───────┐
   ↓               ↓
Exists          Not Exists
   ↓               ↓
Skip Email    Send Email
   ↓               ↓
Log Skip      Create Notification
   ↓               ↓
Wait 6hrs     Mark as Unread
   ↓               ↓
Repeat        Admin Reads
                   ↓
              Mark as Read
                   ↓
              Next Check
                   ↓
           (Can alert again)
```

---

## 🚨 **Current Low Stock Items**

Based on seed data, these items trigger alerts:
1. **Manila Folders (OFF-004):** 3/20 units
2. **Packing Tape (WARE-001):** 2/25 units
3. **Work Gloves (SAFE-003):** 4/30 units

**To Stop Alerts:**
- Restock these items above minimum quantity
- Or mark notifications as read (will alert again in 6 hours if still low)

---

## 💡 **Quick Actions**

### **Stop All Low Stock Emails:**
```sql
-- Mark all low stock notifications as read
UPDATE notifications 
SET read = true 
WHERE type = 'LOW_STOCK' AND read = false;
```

### **Disable Email Notifications:**
1. Go to **Settings** → **Notification Preferences**
2. Toggle off "Low Stock Alerts"
3. You'll still see in-app notifications, but no emails

### **Adjust Check Frequency:**
Edit `/backend/src/middleware/inventoryAlerts.ts`:
```typescript
// Change from 6 hours to desired interval
setInterval(() => {
  this.runInventoryChecks();
}, 6 * 60 * 60 * 1000); // 6 hours
```

---

## ✅ **Summary**

**Problem:** Receiving duplicate emails for same low stock items
**Solution:** Smart duplicate detection based on unread notifications
**Result:** 
- ✅ No duplicate emails while notification is unread
- ✅ Reminder emails after reading (if issue persists)
- ✅ Reduced check frequency (6 hours instead of 1 hour)
- ✅ Clean inbox with relevant alerts only

**Action Required:**
1. Read notifications in system after taking action
2. Restock low items to stop alerts permanently
3. Use notification preferences to customize alerts

---

## 📞 **Support**

If you continue receiving duplicate emails:
1. Check notification is marked as read in system
2. Verify items are restocked above minimum
3. Check email preferences in Settings
4. Review server logs for duplicate detection messages

**Log Location:** `/backend/logs/` or console output
**Look for:** "Skipping duplicate low stock alert"

---

**Updated:** February 2024
**Version:** 2.2.1 - Smart Notifications
