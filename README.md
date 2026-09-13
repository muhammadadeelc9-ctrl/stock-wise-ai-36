# Inventory Compass

Build a complete, production-style SaaS web application called AI Inventory Intelligence.

PRODUCT VISION

AI Inventory Intelligence is an intelligent inventory management and decision-support platform for small and medium-sized businesses.

The app must not behave like a simple stock counter.

It should analyze products, sales history, current stock, demand trends, product value, sales velocity, and inventory movement, then clearly tell the business owner:

How much stock is available

How much stock has been sold

Which products have high demand

Which products have low demand

Which products should be kept in stock

Which products need reordering

Which products are likely to run out soon

Which products are overstocked

Which products are slow-moving/dead stock

Where money is unnecessarily tied up in inventory

Which products deserve priority

What action the owner should take

The main philosophy is:

Don't just show data. Analyze the data and tell the user what to do.

1. TECH STACK

Build a modern full-stack web application.

Preferred stack:

Next.js

TypeScript

Tailwind CSS

shadcn/ui

Supabase

PostgreSQL

Recharts

Lucide icons

Use clean component architecture and reusable components.

If external AI API keys are unavailable, implement a realistic local/demo AI analysis engine so the application still works completely without an API key.

The application must be functional, not a static prototype.

2. AUTHENTICATION

Create:

Sign up

Login

Logout

Forgot password UI

Protected dashboard

User profile

Business profile

Business profile fields:

Business name

Business type

Currency

Country

Default supplier lead time

Low-stock threshold

3. MAIN DASHBOARD

Create a professional SaaS dashboard.

Top section:

Good morning, [Business Name]

Subtitle:

"Here is what needs your attention today."

Show KPI cards:

Total Products

Total Units in Stock

Inventory Value

Units Sold

Low Stock Products

Products at Risk

Overstocked Products

Slow-Moving Products

Each KPI should be clickable and open the relevant filtered section.

4. INTELLIGENT INVENTORY HEALTH

Create a large visual section called:

Inventory Health

Show:

Healthy Stock

Low Stock

Critical Stock

Overstocked

Slow Moving

Out of Stock

Use clear badges and charts.

Also calculate an overall:

Inventory Health Score: 82/100

The score should be calculated from factors such as:

stock availability

demand

stockout risk

overstock

slow-moving inventory

sales velocity

5. AI INVENTORY INSIGHTS

This is the most important feature.

Create a section:

AI Insights

The system should automatically analyze inventory and generate actionable insights.

Examples:

High Demand

"Black Hoodie has high and increasing demand. Current stock may not be sufficient for the next 14 days. Consider reordering."

Low Demand

"Red Jacket has low sales velocity compared with other products. Avoid purchasing additional units until demand improves."

Overstock

"Blue Jeans currently have approximately 72 days of inventory remaining while recent demand is low. Future purchasing should be reduced."

Stockout Risk

"White Sneakers may run out in approximately 6 days based on recent sales velocity."

Money Locked

"Approximately $4,800 is tied up in slow-moving inventory."

Priority Product

"Black T-Shirt should receive purchasing priority because of high demand, strong sales velocity, and low remaining stock."

Each insight must include:

Product

Problem

Reason

Recommended action

Priority

Estimated impact where possible

Priority levels:

Critical

High

Medium

Low

6. PRODUCT MANAGEMENT

Create a complete Products page.

Each product should contain:

Product name

SKU

Category

Supplier

Cost price

Selling price

Current stock

Minimum stock

Maximum stock

Supplier lead time

Units sold

Revenue

Last sale date

Created date

Allow:

Add product

Edit product

Delete product

Search

Filter

Sort

Category filtering

Stock status filtering

7. PRODUCT INTELLIGENCE PAGE

When the user opens a product, create a detailed analytics page.

Show:

Product Overview

Current stock

Units sold

Revenue

Cost value

Profit estimate

Sales velocity

Days of stock remaining

Demand level

Inventory status

Demand Analysis

Show a sales chart over time.

Analyze:

Recent sales

Historical sales

Growth/decline

Sales velocity

Demand trend

Classify demand as:

Very High

High

Medium

Low

Very Low

AI Recommendation

Show a large recommendation card:

Recommended Action

Examples:

Reorder now

Reorder soon

Maintain current stock

Reduce purchasing

Stop purchasing temporarily

Promote slow-moving stock

Investigate unusual demand

Explain WHY the recommendation was made.

8. SALES DATA

Create a Sales page.

Allow users to:

Add sale manually

Import sales using CSV

View sales history

Search sales

Filter by date

Filter by product

View quantity sold

View revenue

CSV import should support columns such as:

date, product, SKU, quantity, selling_price

After importing sales, automatically update inventory analytics.

9. INVENTORY MOVEMENT

Create an inventory movement system.

Track:

Stock received

Stock sold

Stock adjusted

Stock returned

Stock damaged

Every movement should have:

Product

Quantity

Movement type

Date

Reason

User

Maintain an inventory history/audit trail.

10. DEMAND FORECASTING

Create a forecasting engine.

Use historical sales to estimate future demand.

For MVP, use a reliable statistical approach such as:

Moving average

Weighted moving average

Recent sales velocity

Trend adjustment

Do NOT pretend that an advanced ML model exists if it does not.

Display:

Forecast: Next 7 Days
Forecast: Next 30 Days
Forecast: Next 60 Days

Example:

Current stock: 80

Expected 30-day demand: 145

Expected stockout: 17 days

Recommended reorder quantity: 100

Explain the calculation in simple language.

11. STOCKOUT PREDICTION

Create a Stockout Risk page.

For every product calculate:

Days Remaining = Current Stock / Average Daily Sales

Then consider supplier lead time.

Example:

Current stock: 30

Average daily sales: 4

Estimated stockout: 7.5 days

Supplier lead time: 10 days

Result:

🔴 HIGH STOCKOUT RISK

Recommendation:

"Reorder before the current inventory is exhausted."

Create filters:

Critical

High

Medium

Low

12. SMART REORDER SYSTEM

Create a page:

Recommended Purchases

For every product that needs replenishment show:

Product

Current stock

Expected demand

Supplier lead time

Safety stock

Recommended reorder quantity

Reason

Priority

Example:

Black Hoodie

Current stock: 25

Expected demand: 90

Safety stock: 15

Recommended order:

80 units

Include an explanation:

"Demand is increasing and current inventory is unlikely to cover supplier lead time plus safety stock."

Allow:

Mark as reviewed

Add to purchase list

Ignore recommendation

13. OVERSTOCK DETECTION

Create an Overstock page.

Detect products where inventory is significantly higher than expected demand.

Show:

Product

Current stock

Estimated days of inventory

Recent demand

Inventory value

Recommended action

Example:

"200 units available"

"Expected demand: 45 units"

"Estimated excess: 155 units"

"Inventory value tied up: $3,100"

Recommendation:

"Reduce future purchasing and consider promotional activity."

14. SLOW-MOVING / DEAD STOCK

Create a page called:

Slow-Moving Inventory

Identify products with:

Very low sales velocity

No recent sales

High inventory quantity

High inventory value

Show:

Units remaining

Days since last sale

Inventory value

Units sold in last 30 days

Units sold in last 90 days

Provide recommendations.

15. PRODUCT PRIORITY MATRIX

Create an intelligent product matrix.

Analyze products using:

Demand

Sales velocity

Revenue contribution

Profit potential

Stock availability

Stockout risk

Classify products:

⭐ Priority Products

High demand + important revenue + insufficient stock.

🟢 Maintain

Healthy demand + healthy inventory.

🟡 Watch

Uncertain or changing demand.

🔴 Reduce

Low demand + excessive inventory.

⚫ Stop Purchasing

Very low demand + excessive stock.

Display this visually using a matrix/chart.

16. INVENTORY VALUE ANALYSIS

Create a financial inventory section.

Calculate:

Inventory Cost Value

Current units × cost price

Also show:

Total inventory value

Value of healthy stock

Value of slow stock

Value of overstock

Value at risk

Example:

Total Inventory: $25,400

Healthy Inventory: $15,200

Slow Inventory: $6,100

Overstock: $4,100

This helps the owner understand where business money is tied up.

17. TOP PRODUCTS

Create sections for:

Top Selling Products

Rank by units sold.

Top Revenue Products

Rank by revenue.

Fastest Growing Products

Rank by recent demand growth.

Slowest Products

Rank by low sales velocity.

Highest Value Inventory

Products containing the most inventory value.

18. ALERT CENTER

Create a notification/alert system.

Alerts should include:

Stockout warning

Critical low stock

High demand

Overstock

Slow-moving product

Unusual sales change

Reorder recommendation

Example:

🔴 "Black Hoodie may stock out in 5 days."

🟠 "Red Jacket has not sold in 32 days."

🟡 "Blue T-Shirt demand increased 28%."

Allow users to mark alerts as read.

19. AI INVENTORY ASSISTANT

Create an AI-style assistant inside the dashboard.

The assistant should answer questions using the user's inventory data.

Examples:

User:

"Which products need attention?"

Answer:

"3 products require attention. Black Hoodie has high stockout risk, Red Jacket is overstocked, and White Shoes have rapidly increasing demand."

User:

"Which products should I reorder?"

Answer using actual inventory calculations.

User:

"Where is most of my money stuck?"

Answer based on inventory value.

User:

"Which products are performing best?"

Answer using sales and revenue data.

IMPORTANT:

The assistant must use actual application data rather than generating random answers.

If no AI API is configured, implement deterministic local responses based on inventory calculations.

20. WHAT-IF SIMULATOR

Create a feature:

Inventory What-If

Allow the user to change assumptions such as:

Demand increases by 10%

Demand increases by 20%

Demand decreases by 20%

Supplier lead time increases

Sales campaign increases demand

Then show how these changes affect:

Stockout date

Required inventory

Reorder quantity

Inventory value

Example:

Current forecast:

Stockout in 14 days

If demand increases 20%:

Stockout in 11 days

Recommended reorder changes:

80 → 110 units

21. CSV IMPORT

Make CSV import extremely simple.

Provide a sample CSV download/template.

Support:

Products CSV

Sales CSV

Validate imported data.

Show:

Successful rows

Failed rows

Validation errors

Never silently import invalid data.

22. DEMO DATA

The application must include a Load Demo Business Data option.

Create realistic demo data for an imaginary e-commerce business.

Include at least 20 products with different scenarios:

High demand

Low demand

Overstock

Stockout risk

Healthy inventory

Fast-growing demand

Slow-moving

Out of stock

Generate realistic sales history for the demo products.

This is extremely important because the application must look impressive immediately after launch.

23. SEARCH AND FILTERING

Global search should allow searching:

Product

SKU

Category

Supplier

Filters should include:

Stock status

Demand level

Priority

Product category

Supplier

24. REPORTS

Create an Inventory Report page.

Show:

Inventory summary

Top products

Low stock

Stockout risks

Overstock

Slow-moving stock

Inventory value

Recommended actions

Allow export to CSV/PDF if practical.

25. UI / UX

Design should feel like a premium modern SaaS product.

Use:

Clean dashboard

Professional typography

Cards

Charts

Tables

Status badges

Tooltips

Empty states

Loading states

Toast notifications

Responsive layout

Desktop-first but fully responsive.

Sidebar navigation:

Dashboard
Products
Sales
Inventory
Forecast
Recommendations
Slow-Moving
Alerts
AI Assistant
Reports
Settings

Do not overload the interface.

The most important information should be visible immediately.

26. DASHBOARD PRIORITY

The dashboard should answer these questions immediately:

How much inventory do I have?

How much is it worth?

What is selling?

What is not selling?

What is about to run out?

What is overstocked?

Where is my money stuck?

What should I reorder?

What should I stop buying?

What needs my attention today?

27. BUSINESS LOGIC

Implement real calculations.

Important metrics:

Average Daily Sales
Sales Velocity
Days of Inventory Remaining
Demand Trend
Inventory Turnover
Stockout Risk
Safety Stock
Reorder Point
Recommended Reorder Quantity
Inventory Value
Excess Inventory
Slow-Moving Inventory
Revenue Contribution

Do not create fake hardcoded analytics.

All analytics should update when products or sales data changes.

28. RECOMMENDATION ENGINE

Create a rule-based intelligence engine for the MVP.

Example logic:

IF demand is high AND stock is low:
→ HIGH PRIORITY REORDER

IF demand is increasing AND stock coverage is below supplier lead time:
→ REORDER SOON

IF demand is low AND stock coverage is very high:
→ OVERSTOCK

IF sales are extremely low AND days since last sale is high:
→ SLOW MOVING

IF stock = 0:
→ OUT OF STOCK

IF demand is high AND inventory is healthy:
→ MAINTAIN

Give every recommendation a human-readable reason.

29. DATABASE

Create proper relational database tables for:

users
businesses
products
categories
suppliers
sales
inventory_movements
forecasts
recommendations
alerts
user_settings

Add proper relationships and timestamps.

Use secure row-level access so users only see their own business data.

30. LANDING PAGE

Create a professional marketing landing page.

Hero:

Know Your Inventory Before It Becomes a Problem.

Subtitle:

"AI Inventory Intelligence analyzes your stock, sales and demand to tell you what to reorder, what to reduce, and where your money is stuck."

CTA:

Start Analyzing Inventory

Secondary CTA:

View Demo

Sections:

Problem

How It Works

Smart Inventory Insights

Demand Forecasting

Stockout Prediction

Overstock Detection

AI Recommendations

Dashboard Preview

Pricing

FAQ

31. PRICING PAGE

Create realistic SaaS pricing UI:

Starter

For small businesses

Growth

For growing businesses

Business

For larger inventory operations

The pricing buttons can be non-functional initially, but the UI must be complete.

32. SETTINGS

Settings should include:

Business profile

Currency

Inventory thresholds

Default supplier lead time

Notification preferences

Account settings

33. ERROR HANDLING

Implement proper:

Form validation

CSV validation

API error states

Empty states

Loading states

Database error handling

Authentication error handling

Never show a blank screen when something fails.

34. IMPORTANT PRODUCT PRINCIPLE

Do NOT build this as a generic AI wrapper.

AI is only one part of the product.

The actual product value comes from:

DATA → ANALYSIS → PREDICTION → RECOMMENDATION → ACTION

The user should feel:

"I don't have to analyze my inventory manually anymore. The system already tells me what needs attention."

35. FINAL REQUIREMENT

Build the complete application end-to-end.

Do not stop after creating the landing page.

Do not create only mockups.

Implement:

Frontend

Backend

Database

Authentication

Product management

Sales management

Inventory tracking

Analytics

Forecasting

Recommendation engine

Alerts

AI assistant

Demo data

CSV import

Reports

Settings

Make the application runnable.

If an external integration or AI API is unavailable, provide a working local fallback instead of leaving broken buttons or unfinished features.

Before finishing, test the main user journey:

Sign up → create business → load demo data → view dashboard → inspect product → import sales → see inventory analysis → receive recommendations → view forecast → use AI assistant.

The final result should look and feel like a real SaaS product that could be demonstrated to a teacher or potential customer.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/788b57a6-15d1-435b-9662-784d1a8f9da4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
