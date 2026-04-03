const http = require('http');

const tests = [
  {
    name: "Test 1: Crear página SIN emoji",
    payload: {
      channel: "notion",
      recipients: ["webhook"],
      message: "Test 1: Pagina sin emoji - Opción A",
      operation: "create_page",
      metadata: {
        parent_page_id: "336a9ff3e074807a9cc1cd3ef9aead2b"
      }
    }
  },
  {
    name: "Test 2: Crear página CON emoji (rocket)",
    payload: {
      channel: "notion",
      recipients: ["webhook"],
      message: "Test 2: Pagina con emoji rocket",
      operation: "create_page",
      metadata: {
        parent_page_id: "336a9ff3e074807a9cc1cd3ef9aead2b",
        icon: "🚀"
      }
    }
  }
];

function sendTest(test, index) {
  return new Promise((resolve) => {
    const data = JSON.stringify(test.payload, null, 2);
    
    console.log(`\nPayload (UTF-8):`);
    console.log(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/messages/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data, 'utf8')
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n${test.name}`);
        console.log('='.repeat(60));
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 201) {
          try {
            const response = JSON.parse(body);
            console.log(`Message ID: ${response.data.id}`);
            console.log(`Status: QUEUED`);
          } catch (e) {
            console.log('Response:', body);
          }
        } else {
          console.log('Response:', body);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`Error: ${e.message}`);
      resolve();
    });

    req.write(data, 'utf8');
    req.end();
  });
}

async function runTests() {
  console.log('🧪 NOTION INTEGRATION TESTS - OPCIÓN A: EMOJIS ESTÁNDAR');
  console.log('='.repeat(60));
  
  for (let i = 0; i < tests.length; i++) {
    await sendTest(tests[i], i);
    if (i < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✓ Todos los tests enviados');
  console.log('Aguardando 3 segundos para ver los logs del servicio...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
}

runTests();
