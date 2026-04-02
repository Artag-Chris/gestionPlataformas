const https = require('https');

const token = "IGAAcNmkVLc5NBZAGJoWjM2ZAFNGRm0xUkhUQ1ZAqdGxmck5ZAb0x1NHRJdXBJUXpNZA3FPVmh5SkJZAUzFYVzR1LTNmZAUY5dHpTSlFzUHZAXR1lUT1E1QTVCNzJiTjRPUDdVRHc5eFFIekdBZATVtc2V0cXRHTG13dE9mVTY5R1JKakc4ZAwZDZD";

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    }).on('error', reject);
  });
}

async function checkToken() {
  console.log('\n=== Verificando token actual en .env ===\n');
  
  try {
    const url = `https://graph.instagram.com/v25.0/me?fields=username,id,name&access_token=${token}`;
    const result = await makeRequest(url);
    
    if (result.status === 200 && result.data.username) {
      console.log('✅ Token válido\n');
      console.log('Pertenece a:');
      console.log('  Username:', '@' + result.data.username);
      console.log('  ID:', result.data.id);
      console.log('  Name:', result.data.name || 'N/A');
      
      if (result.data.username.toLowerCase() === 'artagdev') {
        console.log('\n✅ ✅ ¡ESTE ES @artagdev!');
      } else {
        console.log('\n⚠️  Este token NO es de @artagdev');
        console.log('   Es de: @' + result.data.username);
      }
    } else {
      console.log('❌ Error:', result.data.error?.message);
      console.log('Código:', result.data.error?.code);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkToken();
