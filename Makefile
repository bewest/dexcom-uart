
TEST_OPTS=-R tap -r should
MOCHA=./node_modules/.bin/mocha

travis: test test-cov.io

test:
	${MOCHA} ${TEST_OPTS} tests/*.js
test-cov:
	./node_modules/.bin/istanbul cover ./node_modules/mocha/bin/_mocha --report lcovonly -- -R tap -r should tests/*.test.js
test-cov.io: test-cov
	cat ./coverage/lcov.info | ./node_modules/.bin/codecov --verbose
