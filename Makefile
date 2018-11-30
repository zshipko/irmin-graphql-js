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

.PHONY: test
test:
	mkdir -p _build
	cd _build && (git clone https://github.com/zshipko/irmin-web || git pull origin) \
		&& cd irmin-web \
		&& cp ../../irmin.js ./js \
		&& xdg-open http://localhost:8080 \
		&& make test
