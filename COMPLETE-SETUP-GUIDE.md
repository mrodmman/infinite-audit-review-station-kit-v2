## **1\. GitHub Hosting Setup**

To make this system work, your GitHub repository serves as your hosting provider.

* **Root Folder**: Upload index.html, landing.html, and print-sign.html.  
* **The Menus Folder**: Create a folder named /menus/.  
* **The URL Logic**: Your menu links are determined by the filename.  
  * **Rule**: https://\[your-username\].github.io/\[repo-name\]/menus/\[filename\].html  
  * *Example*: If you name your file pizza.html, that is the link you put in the Google Sheet.

---

## **2\. Creating Menus (The AI Workflow)**

When you find a menu photo on Google Maps, use this **exact prompt** to generate your hosted file:

PROMPT:

I have a menu photo from \[Business Name\]. Please:

1. Extract all menu items and format as JSON with this structure:

JSON  
{  
  "businessName": "Dick Weeds",  
  "tagline": "Brews & Grub",  
  "categories": \[  
    {  
      "name": "Appetizers",  
      "items": \[  
        {"name": "Buffalo Wings", "price": "$12.99", "description": "Classic buffalo or BBQ sauce"},  
        {"name": "Loaded Nachos", "price": "$10.99", "description": "Topped with cheese, jalapeños, sour cream"}  
      \]  
    }  
  \]  
}

2. Then generate a beautiful mobile-first HTML menu page. Replace \[BUSINESS\_NAME\], \[TAGLINE\], and \[MENU\_CONTENT\] with the data.

For \[MENU\_CONTENT\], create category blocks like:

HTML  
\<div class="category"\>  
  \<div class="category-title"\>Appetizers\</div\>  
  \<div class="item"\>  
    \<div class="item-header"\>  
      \<div class="item-name"\>Buffalo Wings\</div\>  
      \<div class="item-price"\>$12.99\</div\>  
    \</div\>  
    \<div class="item-description"\>Classic buffalo or BBQ sauce\</div\>  
  \</div\>  
\</div\>

Make it look professional and easy to read on mobile. Give it a color theme and styling that fits the vibe of the menu picture or the name of the restaurant, or both.

**Action:** Copy the code provided by the AI, save it as “restaurantname”.html, and upload it to your GitHub /menus/ folder.

---

## **3\. Google Sheets Setup**

The n8n workflow monitors this sheet. Ensure these exact headers are in Row 1:

| Header | Purpose |
| :---- | :---- |
| **Business Name** | Displays on the Audit and Landing pages. |
| **City** | Personalizes the "Thanks for visiting" text. |
| **KW1, KW2, KW3** | The keywords n8n will check for rankings. |
| **Image URL** | Link to a photo of the business (Header for landing.html). |
| **Menu URL** | **The link to your GitHub HTML file created in Step 2\.** |
| **Review Link** | The Google "Write a Review" URL. |
| **Contact** | Your phone/email for the call-to-action button. |
| **row\_number** | **Mandatory.** Used by n8n to update the sheet. |

---

## **4\. How the "Audit Page" (index.html) Works**

When n8n finishes, it generates an **Audit Link**. When a business owner opens it:

1. **The Ranking Report**: It shows **Green "TOP 3"** badges or **Red "FAIL"** badges for their keywords.  
2. **The Action Buttons** (Bottom of the page):  
   * **"View Review Station"**: Opens landing.html. It pulls the Image URL and Menu URL from your sheet to show them their custom portal.  
   * **"Get Print-Ready Sign"**: Opens print-sign.html. It shows them the "Tap or Scan" sign with a QR code leading to their Review Station.  
   * **"Call / Text"**: A direct line to contact you.

---

## **5\. How to Pitch & Close**

1. **Identify a Lead**: Find a business in the "Fail" zone (Rank 4-20+).  
2. **Build the Asset**: Create the AI menu and add the row to your Sheet.  
3. **The Hook**: Send the Audit Link. *"I ran a local ranking report for you in \[City\]. You are currently missing from the Top 3 for \[KW1\]."*  
4. **The Demo**: Tell them to click **"View Review Station"** at the bottom of the report. Show them the mobile-first menu and review portal you've already built for them.  
5. **The Closer**: Show them the **Print-Ready Sign**. Offer to provide these signs for their tables to automate their 5-star reviews and increase their ranking.

### **How the Static Pages Work (Parameters)**

**Your pages (`index.html`, `landing.html`, etc.) stay exactly the same on your GitHub/Cloudflare hosting. However, they are programmed to look at the URL parameters (the text after the `?` in a link) and inject that data into the page instantly.**

* **The Container: `landing.html` (hosted once).**  
* **The Plug-ins: When the URL says `?biz=Pizza+Hut&menu=...`, the code inside the page grabs those snippets and updates the text and buttons.**

**This means you never have to create a new "Landing Page" file for a new business. You only ever create a new Menu file.**

---

### **2\. The "Quick Fix" for Audit Links**

**Because the pages pull data directly from the URL, you don't actually *need* n8n to re-run if you forgot to add a Menu or Image link to your Google Sheet. You can manually edit the link you send to the client.**

**The `index.html` (Audit Page) is designed to pass its own parameters down to the `landing.html` (Review Station). If you forgot the menu link in your sheet, n8n will generate an Audit Link that is missing that data. You can simply append it yourself.**

#### **Example: Adding a Missing Menu**

**Imagine n8n gave you this Audit Link, but you realized you forgot to include the menu: `https://yourname.github.io/index.html?biz=Taco+Shop&city=Austin`**

**To fix it manually, just add `&menu=` followed by your link: `https://yourname.github.io/index.html?biz=Taco+Shop&city=Austin&menu=https://yourname.github.io/menus/taco-menu.html`**

#### **Example: Adding a Missing Image**

**If the header image is missing, add `&image=`: `https://yourname.github.io/index.html?biz=Taco+Shop&image=https://pizzasite.com/photo.jpg`**

**Why this is powerful: You can send a "test" link to a business owner and, if they say "Can you change the photo?", you just swap the link in the URL and send it back instantly without touching n8n or GitHub.**

---

### **3\. The Flow of Parameters**

**Here is how the data "travels" through your system:**

1. **Google Sheet: Holds the raw data (Names, Ranks, Links).**  
2. **n8n: Packs that data into a long URL (The Audit Link).**  
3. **Audit Page (`index.html`): Reads the Ranks and Name. When the user clicks "View Review Station," the page re-packs that same data into a new link for the landing page.**  
4. **Landing Page (`landing.html`): Reads the `menu` and `image` parameters to show the final demo.**

---

### **Final Master Checklist for Links**

* **Base URL: `https://yourname.github.io/repo-name/`**  
* **Audit Link: `index.html?biz=NAME&city=CITY&rank1=1...`**  
* **Menu Link: `menus/FILENAME.html`**  
* **The Key Parameters:**  
  * **`biz`: Business Name**  
  * **`menu`: Full URL to your hosted menu file**  
  * **`image`: Full URL to a hosted image**  
  * **`review`: The Google Review link**


---

## **Debugging Webhook Failures (Cloudflare Pages)**

If the dashboard says the audit failed, use this checklist:

1. **Confirm this is Pages Functions (not a separate Worker):** your frontend posts to `/api/audit`, which is handled by `functions/api/audit.js`.
2. **Set env vars in Cloudflare Pages:**
   - `WEBHOOK_URL` (required)
   - `API_KEY` (optional; only if your client also sends `x-api-key`)
3. **Open browser DevTools > Network > `/api/audit`:**
   - Check the JSON response body for `error`, `webhookStatus`, and `details`.
   - Copy the `x-debug-id` response header.
4. **Open Cloudflare Pages logs:** search for that debug id (`audit:<debug-id>`) to see server-side details.
5. **If webhook status is non-200:** fix your n8n node path/auth/payload expectations.
6. **If you get reachability errors:** verify webhook host is public HTTPS and not blocked by firewall rules.
7. **Fast config check:** open `https://<your-pages-domain>/api/audit` in your browser. It should return JSON with `checks.webhookConfigured: true` and `checks.webhookLooksValid: true`.

