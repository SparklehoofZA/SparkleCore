sed -i -e 's/"Fetch the water"/'\''Fetch the water'\''/g' server.ts
sed -i -e 's/"Find a way to quench the thirst"/'\''Find a way to quench the thirst'\''/g' server.ts
sed -i -e 's/  }\]/  }\\n\]/g' server.ts
sed -i -e '/  }\]\`;  }\]\`;/c\
]`;' server.ts
