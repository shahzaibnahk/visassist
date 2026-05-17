import asyncio, motor.motor_asyncio
async def main():
    try:
        client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
        db = client.vissaassist
        users = await db.users.find().to_list(10)
        for u in users:
            print(f"{u.get('email')}: pwd={bool(u.get('password'))}, hash={bool(u.get('password_hash'))}")
    except Exception as e:
        print("ERROR:", e)

asyncio.run(main())
