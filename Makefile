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
	cd _build && (git clone https://github.com/zshipko/irmin-graphql-client || git pull origin) \
		&& cd irmin-graphql-client \
		&& dune exec src/bin/main.exe | jq '.' > ../../query.json
