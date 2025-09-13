const API_BASE_URL = 'http://localhost:3002/api';

// Mock token for testing - in real app this would come from auth context
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ODkwMTIzNDU2Nzg5MDEyMyIsImlhdCI6MTczNjc2MzAwMCwiZXhwIjoxNzM5MzU1MDAwfQ.mock_token_for_testing';

interface ChatRequest {
  message: string;
  context?: {
    messages?: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
  };
}

interface ChatResponse {
  status: string;
  data: {
    response: string;
    usedCategories: string[];
  };
}

export const chatAPI = {
  async sendMessage(request: ChatRequest): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_TOKEN}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      return data.data.response;
    } catch (error) {
      console.error('Chat API error:', error);
      throw new Error('Failed to get AI response. Please try again.');
    }
  }
};

export const authAPI = {
  async signup(email: string, password: string, name: string) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      throw new Error('Signup failed');
    }

    return response.json();
  },

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  }
};
