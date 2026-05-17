import pymongo
client = pymongo.MongoClient("mongodb://localhost:27017")
db = client.vissaassist
users = db.users.find()
for u in users:
    print(f"Email: {u.get('email')}, Role: {u.get('role')}, HasPwd: {bool(u.get('password'))}, HasPwdHash: {bool(u.get('password_hash'))}")
