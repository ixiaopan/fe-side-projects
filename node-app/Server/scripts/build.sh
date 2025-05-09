# step 1
yarn install
rimraf dist && tsc
cp package.json './dist'

# step 2
cd dist
yarn install
