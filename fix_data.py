import os
import json

data_dir = r"c:\Users\leonp\EG\public\data"
os.makedirs(data_dir, exist_ok=True)

files = ["stock.json", "users.json", "orders.json"]
for f in files:
    path = os.path.join(data_dir, f)
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        with open(path, "w") as file:
            file.write("[]")
            print(f"Created/Fixed {f}")
