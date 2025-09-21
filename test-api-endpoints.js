// Test script to verify API endpoints work with QVAC
require("dotenv").config();

async function testApiEndpoints() {
  try {
    console.log("Starting API server for testing...");
    
    const { createApiServer } = require("./server/api");
    const api = await createApiServer();
    
    const port = 8789;
    const server = api.listen(port, async () => {
      console.log(`✅ Test API server running on http://localhost:${port}`);
      
      // Test the AI transform endpoint
      console.log("\n🧪 Testing AI transform endpoint...");
      
      const testPayload = {
        prompt: "Add a comment to this function",
        code: "function hello() { console.log('Hello World'); }",
        name: "test.js"
      };
      
      try {
        const response = await fetch(`http://localhost:${port}/api/ai/transform`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("✅ AI transform endpoint working!");
          console.log("Response:", result);
        } else {
          console.log("❌ AI transform endpoint failed:", response.status, await response.text());
        }
      } catch (error) {
        console.log("❌ Error testing AI transform:", error.message);
      }
      
      // Cleanup
      server.close(() => {
        console.log("\n✅ Test completed, server stopped");
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error("❌ Error starting test server:", error);
    process.exit(1);
  }
}

testApiEndpoints();
