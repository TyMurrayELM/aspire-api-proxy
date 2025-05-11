export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const clientId = req.query.clientId;
    const secret = req.query.secret;
    const skip = parseInt(req.query.skip) || 0;
    const top = parseInt(req.query.top) || 1000;
    
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
      return res.status(authResponse.status).json({ 
        error: "Auth failed", details: await authResponse.text() 
      });
    }
    
    const authData = await authResponse.json();
    const token = authData.Token;
    
    if (!token) {
      return res.status(500).json({ error: "No token in auth response" });
    }
    
    // Use token to fetch from Aspire with pagination
    const endpoint = req.query.endpoint || '/Activities';
    const filter = req.query.filter || "ActivityType eq 'Task' and Status ne 'Completed'";
    
    const url = `https://cloud-api.youraspire.com${endpoint}?$filter=${encodeURIComponent(filter)}&$skip=${skip}&$top=${top}`;
    
    const apiResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({ 
        error: "API request failed", details: await apiResponse.text() 
      });
    }
    
    const data = await apiResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}