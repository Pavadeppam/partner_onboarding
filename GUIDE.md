# PartnerScale AI: Enterprise Product Onboarding Platform

PartnerScale AI is an enterprise-grade AI-assisted retail product attribute mapping platform. It solves the complex problem of onboarding partner product data by using Semantic Language Models (SLM) to automatically map partner-specific attributes to a retailer's canonical catalog.

---

## 🚀 How to Run the Project

### **Prerequisites**
- Python 3.10+
- Node.js 18+
- npm or yarn

### **1. Backend Setup (FastAPI)**
The backend handles AI inference, vector search (ChromaDB), and business rule validation.

```bash
# Navigate to backend directory
cd backend

# Install dependencies
python3 -m pip install -r requirements.txt

# Initialize the Vector Database (one-time setup)
# This generates embeddings for the canonical attribute catalog
export PYTHONPATH=$PYTHONPATH:.
python3 app/utils/init_db.py

# Start the API server (Runs on http://localhost:8001)
python3 app/main.py
```

### **2. Frontend Setup (Next.js)**
The frontend provides a metadata-driven UI for partner configuration and AI workspace.

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server (Runs on http://localhost:3000)
npm run dev
```

---

## 🎮 Demo Walkthrough

### **Step 1: Business Context Configuration**
- Open [http://localhost:3000](http://localhost:3000).
- Select a **Business Model** (e.g., Marketplace Wholesale).
- Choose the **Department**, **Category** (e.g., Apparel), and **Region**.
- Click the **Upload Partner CSV** card to proceed.

### **Step 2: AI Mapping Workspace**
- In the center panel, click **Upload Product Feed**.
- The AI will process the (mock) CSV and use the **Sentence-Transformers** model to find semantic matches in the **ChromaDB** vector store.
- **Explainable AI**: Expand a row to see why the AI matched "Shade" to "Color" with a specific confidence score.
- **Rules Engine**: Observe validation warnings (e.g., "Fabric composition is mandatory for apparel") triggered by the `business-rules` library.

### **Step 3: Governance & Review**
- Click **Review Mapping**.
- View the summary cards (Total Attributes, Auto-Mapped, etc.).
- Inspect the **Workflow Timeline** showing the progression from Draft to Activation.
- Click **Submit for Approval** to finalize the onboarding process.

---

## 💡 Use Cases

### **1. Global Fashion Franchise Onboarding**
Fashion retailers working with international franchise partners often receive data in varying languages and formats. PartnerScale AI normalizes "Cloth Material" or "Fabrication" into a single canonical "Fabric Composition" attribute automatically.

### **2. Marketplace Consignment Compliance**
Marketplaces like Zalando or ASOS have strict mandatory field requirements. The platform's **Rules Engine** ensures that partners cannot submit data without mandatory attributes like "Hero Image" or "Country of Origin," reducing manual back-and-forth by weeks.

### **3. Sustainable Supply Chain Integration**
When onboarding new "Green" brands, the platform can semantically match various sustainability ratings (e.g., "Eco-Score", "Sustainability Index") to the retailer's internal "ESG_SCORE" attribute, enabling rapid sustainability reporting.

### **4. Self-Service Partner Portal**
Instead of sending Excel files to a support team, partners use the self-service workspace to upload, review, and fix their own mappings, reducing onboarding time from 3 weeks to 15 minutes.

---

## 🏗 Architecture
- **Text SLM**: `all-MiniLM-L6-v2` via `sentence-transformers`.
- **Vector DB**: `ChromaDB` for historical mapping memory and semantic retrieval.
- **Rules Engine**: `business-rules` for complex retail logic validation.
- **Metadata UI**: Frontend components are dynamically rendered based on JSON schemas from the backend.
