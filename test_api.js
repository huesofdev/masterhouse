const axios = require('axios');
axios.get('http://127.0.0.1:4000/api/operations/trips').then(res => console.log(JSON.stringify(res.data, null, 2))).catch(e => console.error(e.message));
