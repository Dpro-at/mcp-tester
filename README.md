[👉 **Try Online: https://mcp-tester.com**](https://mcp-tester.com) 🌐

# MCP Tool Tester Pro – Universal MCP API Testing & Integration Platform

[![GitHub](https://img.shields.io/badge/GitHub-mcp--tester-181717?logo=github)](https://github.com/Dpro-at/mcp-tester)
[![AI Agent](https://img.shields.io/badge/AI-Agent-blueviolet?logo=ai)](https://mcp-tester.com)
[![License: Custom](https://img.shields.io/badge/license-Custom-green)](#license)

## 🤖 What is MCP Tool Tester Pro?
MCP Tool Tester Pro is a universal, open-source platform for testing, debugging, and integrating any API that implements the Model Context Protocol (MCP). It is **not limited to Laravel**—you can use it with any backend technology (Python, Node.js, Java, PHP, .NET, etc.) as long as your API exposes MCP-compliant endpoints (discovery and execute).

- **Discover and test MCP tools/actions from any server**
- **Send and debug requests with a user-friendly interface**
- **Integrate with AI agents, LLMs, and automation workflows**
- **Track history, save endpoints, and streamline development**
- **Open source, extensible, and easy to use**

> The Laravel section below is a practical example, but the tool works with any MCP-compatible API.

---

## How MCP Works (General Overview)

1. **API Endpoint Discovery**: Your MCP server exposes a discovery endpoint (e.g. `/api/mcp/tools`) listing available actions/tools and their parameters.
2. **Client Prepares a Request**: The client (web app, AI agent, etc.) selects a tool and fills in the required parameters.
3. **Request Execution**: The client sends a POST request to the MCP execute endpoint (e.g. `/api/mcp/execute`).
4. **Backend Routing & Logic**: The backend receives the request, parses the action and input, and routes to the appropriate logic.
5. **Response Handling**: The backend returns a JSON response with the result or an error message.
6. **Frontend Testing Tool**: Use MCP Tool Tester Pro to interactively test, debug, and manage your MCP endpoints.

---

## Example: Using MCP with Laravel

*The following is a full workflow example for a Laravel backend. You can adapt the same steps for any technology that implements MCP.*

### 1. **API Endpoint Discovery**
- MCP exposes a discovery endpoint (e.g. `/api/mcp/tools`) that returns a list of available actions (tools), their descriptions, and required parameters.
- **Example Response:**
```json
{
  "tools": [
    {
      "name": "languages/get",
      "description": "Get all languages for a user",
      "parameters": {
        "type": "object",
        "properties": { "user_id": { "type": "integer" } },
        "required": ["user_id"]
      }
    },
    ...
  ]
}
```

### 2. **Client Prepares a Request**
- The client (web app, AI agent, etc.) selects a tool and fills in the required parameters.
- **Example Request Payload:**
```json
{
  "action": "languages/get",
  "input": { "user_id": 123 }
}
```

### 3. **Request Execution**
- The client sends a POST request to the MCP execute endpoint (e.g. `/api/mcp/execute`).
- **Example cURL:**
```bash
curl -X POST http://localhost:8000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{ "action": "languages/get", "input": { "user_id": 123 } }'
```

### 4. **Backend Routing & Logic**
- The backend (see `backend/mcp_server.php`) receives the request, parses the `action` and `input`, and routes to the appropriate logic.
- **Example PHP Logic:**
```php
$input = file_get_contents('php://input');
$data = json_decode($input, true);
$action = $data['action'];
$params = $data['input'] ?? [];
if ($action === 'languages/get') {
    $userId = $params['user_id'] ?? null;
    $langs = \App\Models\ApplicantLanguages::where('user_id', $userId)->get();
    $result['languages'] = $langs;
    echo json_encode(['extraFields' => $result]);
}
```

### 5. **Response Handling**
- The backend returns a JSON response with the result or an error message.
- **Example Success Response:**
```json
{
  "extraFields": {
    "languages": [
      { "id": 1, "user_id": 123, "language": "English", "level": "Advanced" },
      ...
    ]
  }
}
```
- **Example Error Response:**
```json
{ "error": "user_id required" }
```

### 6. **Frontend Testing Tool**
- The file `test/mcp-test.html` is a full-featured web app for testing MCP endpoints.
- **How it works:**
  1. Enter the Tools Discovery URL and Execute URL.
  2. Click "Load Tools" to fetch available actions.
  3. Select a tool, fill in parameters, and click "Execute Tool".
  4. The tool sends the request, displays the response, and saves the history.
- **Key JavaScript (simplified):**
```js
async function executeTool() {
  const payload = { action: tool.name, input: input, timestamp: new Date().toISOString() };
  const res = await fetch(executeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const responseJson = await res.json();
  responseBox.textContent = JSON.stringify(responseJson, null, 2);
}
```

---

## Full Example: Testing the MCP API

### 1. **Get Available Tools**
- **Request:**
  - `GET http://localhost:8000/api/mcp/tools`
- **Response:**
  - List of tools/actions and their parameters.

### 2. **Execute an Action**
- **Request:**
```json
{
  "action": "languages/add",
  "input": { "user_id": 123, "language": "French", "level": "Intermediate" }
}
```
- **cURL:**
```bash
curl -X POST http://localhost:8000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{ "action": "languages/add", "input": { "user_id": 123, "language": "French", "level": "Intermediate" } }'
```
- **Response:**
```json
{
  "extraFields": {
    "message": "Language added",
    "id": 42
  }
}
```

### 3. **Error Example**
- **Request:**
```json
{
  "action": "languages/add",
  "input": { "user_id": 123, "language": "French" }
}
```
- **Response:**
```json
{ "error": "user_id, language, level required" }
```

---

## How to Test MCP Endpoints (Step by Step)

1. **Start your backend server** (Laravel or PHP, with `mcp_server.php` accessible).
2. **Open `test/mcp-test.html` in your browser.**
3. **Enter the Tools Discovery URL** (e.g. `http://localhost:8000/api/mcp/tools`).
4. **Enter the Execute URL** (e.g. `http://localhost:8000/api/mcp/execute`).
5. **Click "Load Tools"** to fetch available actions.
6. **Select a tool** from the dropdown.
7. **Fill in the required parameters.**
8. **Click "Execute Tool".**
9. **View the response** in the response box.
10. **Check the history** tab for previous requests and responses.

---

## Testing with PHPUnit (Optional)
You can write feature tests in `backend/tests/Feature/` using Laravel's HTTP testing tools:
```php
public function test_languages_get() {
    $response = $this->postJson('/api/mcp/execute', [
        'action' => 'languages/get',
        'input' => ['user_id' => 123]
    ]);
    $response->assertStatus(200);
    $response->assertJsonStructure(['extraFields' => ['languages']]);
}
---

## Important MCP & OpenAI Integration URLs


Below are examples of how to generate and format the most important URLs for MCP and OpenAI (function-calling) integrations in your Laravel project. These are essential for connecting your API to AI agents, testing tools, or external services.

### 1. **MCP Tools Discovery URL**
This endpoint returns the list of available MCP tools/actions and their parameters.
- **Format:**
  - `http://your-domain.com/api/mcp/tools`
- **Example:**
  - `http://localhost:8000/api/mcp/tools`

### 2. **MCP Execute URL**
This endpoint receives action requests and executes them.
- **Format:**
  - `http://your-domain.com/api/mcp/execute`
- **Example:**
  - `http://localhost:8000/api/mcp/execute`

### 3. **OpenAI Function Calling (for AI Agents)**
If you want to connect MCP to OpenAI or similar LLMs that use function-calling, you typically need to provide:
- **Tools/Functions Schema URL:**
  - Same as MCP Tools Discovery URL (see above)
- **Function Execution URL:**
  - Same as MCP Execute URL (see above)
- **Example OpenAI-compatible payload:**
```json
{
  "action": "languages/get",
  "input": { "user_id": 123 }
}
```

### 4. **Other Useful URLs**
- **Company MCP Tools:**
  - `http://your-domain.com/api/mcp/company/tools`
- **Company MCP Execute:**
  - `http://your-domain.com/api/mcp/company/execute`

### 5. **How to Use These URLs**
- In the MCP Tester (`test/mcp-test.html`), paste the Tools Discovery URL and Execute URL in the configuration fields.
- For OpenAI or any LLM agent, use the same URLs for function schema and execution.
- Always use HTTPS in production for security.

---

**This section helps you quickly find and generate the correct URLs for MCP and OpenAI integrations in your Laravel project.**

---

**This README covers every step from endpoint discovery to request execution and testing, with real code and examples.**

---

## OpenAI Plugin Manifest & OpenAPI Schema Examples

To integrate your Laravel MCP API with OpenAI (or any LLM that supports plugins/function-calling), you need to provide:

### 1. **OpenAI Plugin Manifest (ai-plugin.json)**
This file describes your MCP API for OpenAI and other LLMs. Place it at `/.well-known/ai-plugin.json` on your server.

```json
{
  "schema_version": "v1",
  "name_for_model": "flowxtra_mcp",
  "name_for_human": "Flowxtra MCP",
  "description_for_model": "Tools to manage applicant languages using Flowxtra's MCP interface. Supports adding, updating, retrieving, and deleting languages for applicants.",
  "description_for_human": "Manage applicant languages via Flowxtra's backend. Add, get, update, and delete language info securely.",
  "auth": {
    "type": "bearer",
    "authorization_type": "header"
  },
  "api": {
    "type": "openapi",
    "url": "http://localhost:8000/.well-known/openapi.json",
    "openapi_url": "http://localhost:8000/.well-known/openapi.json"
  },
  "logo_url": "https://partners.flowxtra.com/wp-content/uploads/2025/02/MainLogo@2x-2048x466.png",
  "contact_email": "info@flowxtra.com",
  "legal_info_url": "https://flowxtra.com/privacy-policy",
  "version": "1.0.0"
}
```

### 2. **OpenAPI Schema (openapi.json)**
This file describes your MCP API endpoints and should be available at `/.well-known/openapi.json`.

```json
{
  "openapi": "3.0.1",
  "info": {
    "title": "Flowxtra MCP API",
    "version": "1.0.0",
    "description": "API for managing applicant languages via MCP."
  },
  "servers": [
    { "url": "http://localhost:8000" }
  ],
  "paths": {
    "/api/mcp/execute": {
      "post": {
        "summary": "Execute MCP tool",
        "description": "Executes a tool action (add, get, update, delete language)",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "action": { "type": "string", "example": "languages/get" },
                  "input": { "type": "object", "description": "Tool input parameters (see below)" }
                },
                "required": ["action", "input"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": { "type": "object" }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "LanguageAddInput": {
        "type": "object",
        "properties": {
          "user_id": { "type": "integer" },
          "language": { "type": "string" },
          "level": { "type": "string" }
        },
        "required": ["user_id", "language", "level"]
      },
      "LanguageGetInput": {
        "type": "object",
        "properties": {
          "user_id": { "type": "integer" }
        },
        "required": ["user_id"]
      },
      "LanguageUpdateInput": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "language": { "type": "string" },
          "level": { "type": "string" }
        },
        "required": ["id", "language", "level"]
      },
      "LanguageDeleteInput": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" }
        },
        "required": ["id"]
      }
    }
  }
}
```

// add how to add to courser and clouda ai llms 
### Adding to Courser and Clouda AI LLMs

#### Courser AI Integration
1. Navigate to your Courser AI dashboard
2. Go to "API Integrations" > "Add New Integration"
3. Select "MCP API" as the integration type
4. Enter your MCP API base URL
5. Upload or paste your OpenAPI spec (openapi.json)
6. Configure authentication if required
7. Test the connection and save

#### Clouda AI Integration
1. Log into your Clouda AI console
2. Select "Integrations" from the left menu
3. Click "Add Integration" > "Custom API"
4. Choose "MCP Compatible API"
5. Provide your MCP API endpoint URL
6. Upload the OpenAPI specification file
7. Set up any required API keys or tokens
8. Validate and deploy the integration

Both platforms will automatically discover your API's capabilities through the OpenAPI spec and make them available to their respective AI models. The MCP standardization ensures consistent interaction patterns across different LLM platforms.


### 3. **How to Use**
- Place `ai-plugin.json` and `openapi.json` in your server's `/.well-known/` directory.
- Update the URLs to match your production domain (replace `localhost:8000` with your real domain).
- These files allow OpenAI and other LLMs to discover and interact with your MCP API securely and automatically.

---

**With these files and URLs, your Laravel MCP API is ready for seamless integration with OpenAI plugins and any LLM supporting OpenAPI/function-calling.**

---

## Project Description
MCP Tool Tester Pro is a powerful, universal tool designed to simplify the process of testing and integrating MCP APIs with AI agents, LLMs, and external clients. It provides a user-friendly interface for discovering available tools, executing actions, and viewing responses. The platform is open source and works with any backend that supports the MCP standard.

## License
This project is open source. Anyone can use or modify it for any purpose, provided they credit the source and link to [mcp-tester.com](https://mcp-tester.com).



<a href="https://github.com/Dpro-at/mcp-tester" target="_blank" title="GitHub"><i class="fab fa-github"></i> GitHub</a>

<!-- Footer Links Row -->
---

<p align="center">
  <a href="https://mcp-tester.com" title="MCP Tool Tester Pro" target="_blank"><img src="https://img.shields.io/badge/Website-mcp--tester.com-4361ee?logo=internet-explorer&logoColor=white" alt="MCP Tool Tester Pro"></a>
  <a href="https://flowxtra.com" title="Flowxtra GmbH" target="_blank"><img src="https://img.shields.io/badge/Flowxtra%20GmbH-Website-00b4d8?logo=cloudsmith&logoColor=white" alt="Flowxtra GmbH"></a>
  <a href="https://www.linkedin.com/company/flowxtra" title="Flowxtra LinkedIn" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-Flowxtra-0a66c2?logo=linkedin&logoColor=white" alt="Flowxtra LinkedIn"></a>
  <a href="https://dpro.at" title="Dpro GmbH" target="_blank"><img src="https://img.shields.io/badge/Dpro%20GmbH-Website-ffb703?logo=cloudsmith&logoColor=white" alt="Dpro GmbH"></a>
  <a href="https://www.linkedin.com/company/dpro-gmbh" title="Dpro LinkedIn" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-Dpro-0a66c2?logo=linkedin&logoColor=white" alt="Dpro LinkedIn"></a>
  <a href="https://fity.at/" title="Fity GmbH" target="_blank"><img src="https://img.shields.io/badge/Fity%20GmbH-Website-43aa8b?logo=cloudsmith&logoColor=white" alt="Fity GmbH"></a>
  <a href="https://www.linkedin.com/company/fityat" title="Fity LinkedIn" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-Fity-0a66c2?logo=linkedin&logoColor=white" alt="Fity LinkedIn"></a>
</p>
