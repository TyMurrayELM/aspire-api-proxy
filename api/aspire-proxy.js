// api/aspire-proxy.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    // Log all parameters for debugging
    console.log("Request parameters:", JSON.stringify(req.query));
    
    const clientId = req.query.clientId;
    const secret = req.query.secret;
    
    // Use either the custom filter or fallback to endpoint-specific default
    const customFilter = req.query.filter;
    const pageNumber = parseInt(req.query.$pagenumber || req.query.pagenumber || 1);
    const limit = parseInt(req.query.$limit || req.query.limit || 1000);
    const orderby = req.query.$orderby || req.query.orderby; // Add orderby support
    const endpoint = req.query.endpoint || '/Activities';
    
    console.log(`Processing endpoint: ${endpoint}, filter: ${customFilter || "default"}, pageNumber=${pageNumber}, limit=${limit}, orderby=${orderby || "none"}`);
    
    if (!clientId || !secret) {
      return res.status(400).json({ error: "Missing credentials" });
    }
    
    // Get auth token from Aspire
    const authResponse = await fetch('https://cloud-api.youraspire.com/Authorization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ClientId: clientId, Secret: secret })
    });
    
    if (!authResponse.ok) {
      const authErrorText = await authResponse.text();
      console.error('Auth error:', authErrorText);
      return res.status(authResponse.status).json({ 
        error: "Auth failed", 
        details: authErrorText
      });
    }
    
    const authData = await authResponse.json();
    const token = authData.Token;
    
    if (!token) {
      return res.status(500).json({ error: "No token in auth response" });
    }
    
    // Determine default filter based on endpoint
    let defaultFilter = null;
    if (endpoint === '/Activities') {
      defaultFilter = "ActivityType eq 'Task' and Status ne 'Completed'";
    }
    // For /Opportunities, no default filter (unless one is provided)
    
    const filter = customFilter || defaultFilter;
    
    // Build URL - only add filter if it exists
    let url = `https://cloud-api.youraspire.com${endpoint}?$pagenumber=${pageNumber}&$limit=${limit}`;
    if (filter) {
      url += `&$filter=${encodeURIComponent(filter)}`;
    }
    if (orderby) {
      url += `&$orderby=${encodeURIComponent(orderby)}`;
    }
    
    console.log("Calling Aspire API URL:", url);
    
    const apiResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!apiResponse.ok) {
      const apiErrorText = await apiResponse.text();
      console.error('API error:', apiErrorText);
      return res.status(apiResponse.status).json({ 
        error: "API request failed", 
        details: apiErrorText,
        url: url
      });
    }
    
    const data = await apiResponse.json();
    
    // Log some basic info about the response
    if (data && data.value) {
      console.log(`Response contains ${data.value.length} records`);
      if (data.value.length > 0 && endpoint === '/Activities') {
        console.log("First few IDs:", data.value.slice(0, 3).map(t => t.ActivityID).join(", "));
        console.log("Last few IDs:", data.value.slice(-3).map(t => t.ActivityID).join(", "));
      } else if (data.value.length > 0 && endpoint === '/Opportunities') {
        console.log("First few IDs:", data.value.slice(0, 3).map(t => t.OpportunityID).join(", "));
        console.log("Last few IDs:", data.value.slice(-3).map(t => t.OpportunityID).join(", "));
      }
    }
    
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}