import asyncio
from langgraph_sdk import get_client

async def main() -> None:
    client = get_client()
    assistant_id = "agent"
    thread = await client.threads.create()
    print(thread)

    input = {"messages": [{"role": "user", "content": "日付が分かるデータですか？"}]}

    async for chunk in client.runs.stream(
        thread["thread_id"],
        assistant_id,
        input=input,
        stream_mode="updates",
        config={
            "configurable": { "model_name": "openai" }
        }
    ):
        print(f"Receiving new event of type: {chunk.event}...")
        print(chunk.data)
        print("\n\n")

if __name__ == '__main__':
    asyncio.run(main())
