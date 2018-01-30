# jt400-pgm
NodeJS wrapper to call IBM iSeries AS/400 programs
[![Version](https://img.shields.io/npm/v/jt400-pgm.svg)](https://npmjs.org/package/jt400-pgm)

This module use [JT400.jar](http://jt400.sourceforge.net/) and [Java bridge](https://www.npmjs.com/package/java) 

## Configure connection with AS/400 system
```javascript
	
	const Pgm = require('jt400-pgm');
	
	let pgm = new Pgm("127.0.0.1","user","password","/QSYS.LIB/PROGRAM.LIB/PGM1.PGM");
	
```

## Configure program call

```javascript

	pgm.setParams(model,inputData)
	
```

```javascript

	pgm.setParams([
			{ name:'textParam', type:'text', size:50, kind:'in' },
			{ name:'intParam', type:'bin4', kind:'in' },
			{ name:'decimalParam', type:'zoned', size:5, precision:2, kind:'in' },
			{ name:'decimalParam2', type:'packed', size:5, precision:2, kind:'in' },
			{ name:'nboccur', type:'bin4', kind:'out' },
			{ name:'datastruct', type:'array', size:20, kind:'out', nboccurField:'nboccur', struct: [
				{name:'param1', type:'text', size:10},
				{name:'param2', type:'text', size:12},
				{name:'param3', type:'text', size:15},
				] 
			}
		],{
			textParam:'this is a test',
			intParam:12,
			decimalParam:123.45,
			decimalParam2:678.10,
		});

```

## Run program call
```javascript

		try {
			var res=await pgm.run();
	
			console.log(res);
		} catch(err) {
			console.log(err);
		}
```


## Full program call
```javascript

	const Pgm = require('jt400-pgm');
	async function start() {
		let pgm = new Pgm("127.0.0.1","user","password","/QSYS.LIB/PROGRAM.LIB/PGM1.PGM");
		pgm.setParams([
			{ name:'textParam', type:'text', size:50, kind:'in' },
			{ name:'intParam', type:'bin4', kind:'in' },
			{ name:'decimalParam', type:'zoned', size:5, precision:2, kind:'in' },
			{ name:'decimalParam2', type:'packed', size:5, precision:2, kind:'in' },
			{ name:'nboccur', type:'bin4', kind:'out' },
			{ name:'datastruct', type:'array', size:20, kind:'out', nboccurField:'nboccur', struct: [
				{name:'param1', type:'text', size:10},
				{name:'param2', type:'text', size:12},
				{name:'param3', type:'text', size:15},
				] 
			}
		],{
			textParam:'this is a test',
			intParam:12,
			decimalParam:123.45,
			decimalParam2:678.10,
		});
		try {
			var res=await pgm.run();
	
			console.log(res);
		} catch(err) {
			console.log(err);
		}
	}
	start();
```