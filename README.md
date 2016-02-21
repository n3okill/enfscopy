[![Build Status](https://travis-ci.org/n3okill/enfscopy.svg)](https://travis-ci.org/n3okill/enfscopy)
[![Build status](https://ci.appveyor.com/api/projects/status/wtrnfoek893y2x4p?svg=true)](https://ci.appveyor.com/project/n3okill/enfscopy)
[![Codacy Badge](https://api.codacy.com/project/badge/grade/478a5bf200e44bec8dbb6d6ed5e96dad)](https://www.codacy.com/app/n3okill/enfscopy)
[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=64PYTCDH5UNZ6)

[![NPM](https://nodei.co/npm/enfscopy.png)](https://nodei.co/npm/enfscopy/)

enfscopy
=========
Module that add copy functionality to node fs module
**enfs** stands for [E]asy [N]ode [fs]

Description
-----------
This module will add a method that allows the copy of multiple files
and folder in the file system, similar to cp -R

- This module will add following methods to node fs module:
  * copy
  * copySync
  
Usage
-----
`enfscopy`

```js
    var enfscopy = require("esnofscopy");
```

Errors
------
All the methods follows the node culture.
- Async: Every async method returns an Error in the first callback parameter
- Sync: Every sync method throws an Error.


Additional Methods
------------------
- [copy](#copy)
- [copySync](#copysync)


### copy
  - **copy(srcPath, dstPath, [options], callback)**

> Asynchronously copy items in the file system


[options]:
  * fs (Object): an alternative fs module to use (default will be [enfspatch](https://www.npmjs.com/package/enfspatch))
  * limit (Integer): the limit number of files being copied at a moment (Default: fs module limit or 512)
  * overwrite (Boolean): if true will overwrite destination files if they exist before copy (Default: false)
  * preserveTimestamps (Boolean): if true will preserve the timestamps of copied items (Default: false)
  * stopOnError (Boolean): if true will stop copy execution at first error (Default: false)
  * dereference (Boolean): if true will dereference symlinks copying the items to where it points (default: false)
  * errors (Array or Stream): If array or stream, the errors that occur will be logged and returned


```js
    enfscopy.copy("/path/to/src/folder", "/path/to/destination", function(err, statistics){
        if(!err){
            console.log("Copied %d items with a total size of %d",statistics.items,statistics.size);
        }
    });
```


### copySync
  - **copySync(srcPath, dstPath, [options])**

> Synchronously copy items in the file system


[options]:
  * fs (Object): an alternative fs module to use (default will be [enfspatch](https://www.npmjs.com/package/enfspatch))
  * limit (Integer): the limit number of files being copied at a moment (Default: fs module limit or 512)
  * overwrite (Boolean): if true will overwrite destination files if they exist before copy (Default: false)
  * preserveTimestamps (Boolean): if true will preserve the timestamps of copied items (Default: false)
  * stopOnError (Boolean): if true will stop copy execution at first error (Default: false)
  * dereference (Boolean): if true will dereference symlinks copying the items to where it points (default: false)
  * errors (Array or Stream): If array or stream, the errors that occur will be logged and returned



```js
    var statistics = enfscopy.copySync("/path/to/src/folder", "/path/to/destination");
    console.log("Copied %d items with a total size of %d",statistics.items,statistics.size);
```

Credit
------
This functionality is based on [NCP](https://github.com/AvianFlu/ncp) with many improvements.



License
-------

Creative Commons Attribution 4.0 International License

Copyright (c) 2016 Joao Parreira <joaofrparreira@gmail.com> [GitHub](https://github.com/n3okill)

This work is licensed under the Creative Commons Attribution 4.0 International License. 
To view a copy of this license, visit [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/).


