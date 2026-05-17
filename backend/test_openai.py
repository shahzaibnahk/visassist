import os
from dotenv import load_dotenv
from openai import AzureOpenAI

# Load env vars
load_dotenv()

# Get keys from .env or use defaults for testing
API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "your-key-here")
ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "https://21-cs-mlosoqqe-polandcentral.services.ai.azure.com/")
DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "Llama-3.3-70B-Instruct")

def test_azure_openai():
    print("Testing Azure OpenAI connection...")
    
    try:
        client = AzureOpenAI(
            api_key=API_KEY,
            api_version="2024-02-15-preview",
            azure_endpoint=ENDPOINT
        )
        
        print(f"Sending request to deployment: {DEPLOYMENT_NAME}")
        
        completion = client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[
                {
                    "role": "user",
                    "content": "What is the capital of France? Reply in one word.",
                }
            ],
            max_tokens=10
        )
        
        print("\nSuccess! Response received:")
        print("-" * 30)
        print(completion.choices[0].message.content)
        print("-" * 30)
        
    except Exception as e:
        print(f"\nError occurred: {type(e).__name__}")
        print(str(e))

if __name__ == "__main__":
    test_azure_openai()
