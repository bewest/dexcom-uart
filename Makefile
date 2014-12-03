
TEST_OPTS=-R tap -r should
MOCHA=./node_modules/.bin/mocha


test:
	${MOCHA} ${TEST_OPTS} tests/*.js
