build: query.json
	mkdir -p _build
	sed '/\/\/ queries/q' irmin.js > _build/irmin.js
	printf "\nquery = " >> _build/irmin.js
	cat query.json >> _build/irmin.js
	cp _build/irmin.js .

clean:
	rm -rf _build

.PHONY: query.json
query.json:
	mkdir -p _build
	cd _build && (git clone -b graphql-client https://github.com/zshipko/irmin --depth 1 || git pull origin) \
		&& cd irmin \
		&& dune exec src/irmin-unix/bin/main.exe graphql-queries | jq '.' > ../../query.json
