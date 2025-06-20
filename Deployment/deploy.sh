#!/bin/bash
cd ~

if command -v yum >/dev/null; then
    echo "System uses yum"
    sudo yum update
    sudo yum -y install git
    sudo yum -y install npm
    sudo yum -y install libcap2-bin
elif command -v apt-get >/dev/null; then
    echo "System uses apt"
    sudo apt-get update
    sudo apt-get -y install git
    sudo apt-get -y install npm
    sudo apt-get -y install libcap2-bin
else
  echo "Unknown package manager"
  return 1
fi


git clone https://github.com/Lingosia/LingosiaWebApp.git

cd ~/LingosiaWebApp/Server

npm install

mkdir ./certificates
openssl req -x509 -newkey rsa:4096 -keyout ./certificates/key.pem -out ./certificates/cert.pem -sha256 -days 3650 -nodes -subj "/C=XX/ST=StateName/L=CityName/O=CompanyName/OU=CompanySectionName/CN=CommonNameOrHostname"

myNodeLocation=$(readlink -f $(which node))
sudo setcap cap_net_bind_service=+ep $myNodeLocation

echo "Starting server: https://localhost/"
npm start > my_app_log.log 2> my_app_err.log
