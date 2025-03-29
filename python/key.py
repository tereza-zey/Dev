import jwt
import time
import requests
import json
# Remplacez par le chemin vers votre fichier de clé de service JSON
SERVICE_ACCOUNT_FILE = 'nstapp-2d25a-firebase-adminsdk-fbsvc-b3be7bc0da.json'

# Charger la clé de service
with open(SERVICE_ACCOUNT_FILE) as f:
    service_account_info = json.load(f)

# Définir les paramètres du JWT
iat = int(time.time())
exp = iat + 3600  # Le jeton expire dans 1 heure
payload = {
    'iss': service_account_info['client_email'],
    'scope': 'https://www.googleapis.com/auth/firebase.messaging',
    'aud': 'https://oauth2.googleapis.com/token',
    'exp': exp,
    'iat': iat
}

# Générer le JWT
additional_headers = {
    'kid': service_account_info['private_key_id']
}
signed_jwt = jwt.encode(payload, service_account_info['private_key'], headers=additional_headers, algorithm='RS256')

# Échanger le JWT contre un jeton d'accès
response = requests.post('https://oauth2.googleapis.com/token', data={
    'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    'assertion': signed_jwt
})

# Afficher le jeton d'accès
access_token = response.json().get('access_token')
print(f'Bearer {access_token}')
