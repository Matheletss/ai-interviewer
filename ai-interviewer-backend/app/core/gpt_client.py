import os
import openai
from openai import OpenAI
from app.core.config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

def generate_greeting(name: str) -> str:
    return f"Hi {name}, welcome! Let's begin. Could you tell me a bit about yourself?"

def generate_followup(resume: str, job_description: str, user_response: str, conversation_history: list = []) -> str:
    with open("app/core/system_prompt.txt", "r") as file:
        system_prompt = file.read()
    messages = [
        {
            "role": "system",
            "content": system_prompt
        }
    ] + conversation_history + [
        {"role": "user", "content": (
            f"Resume:\n{resume}\n\n"
            f"Job Description:\n{job_description}\n\n"
            f"Candidate said:\n{user_response}\n\n"
            f"What would you ask next?"
        )}
    ]

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        temperature=0.7,
        max_tokens=300
    )

    return response.choices[0].message.content.strip()

def generate_thank_you(name: str) -> str:
    return (
        f"Thank you, {name}, for participating in this interview. "
        "We appreciate the time you've taken to share your experiences and insights. "
        "Our team will review your interview and get back to you soon."
    )