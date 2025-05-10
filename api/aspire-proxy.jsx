export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    try {
      const token = req.headers.authorization;
      const endpoint = req.query.endpoint || '/Activities';
      const filter = req.query.filter || "ActivityType eq 'Task' and Status ne 'Completed'";
      
      const url = `https://cloud-api.youraspire.com${endpoint}${filter ? `?$filter=${encodeURIComponent(filter)}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }