import {
  __commonJS,
  __require
} from "./main-ynsbc1hx.js";

// node_modules/@actions/io/lib/io-util.js
var require_io_util = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    Object.defineProperty(o, k2, { enumerable: !0, get: function() {
      return m[k];
    } });
  } : function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    o[k2] = m[k];
  }), __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: !0, value: v });
  } : function(o, v) {
    o.default = v;
  }), __importStar = exports && exports.__importStar || function(mod) {
    if (mod && mod.__esModule)
      return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod)
        if (k !== "default" && Object.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  }, __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }, _a;
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.getCmdPath = exports.tryGetExecutablePath = exports.isRooted = exports.isDirectory = exports.exists = exports.READONLY = exports.UV_FS_O_EXLOCK = exports.IS_WINDOWS = exports.unlink = exports.symlink = exports.stat = exports.rmdir = exports.rm = exports.rename = exports.readlink = exports.readdir = exports.open = exports.mkdir = exports.lstat = exports.copyFile = exports.chmod = void 0;
  var fs = __importStar(__require("fs")), path = __importStar(__require("path"));
  _a = fs.promises, exports.chmod = _a.chmod, exports.copyFile = _a.copyFile, exports.lstat = _a.lstat, exports.mkdir = _a.mkdir, exports.open = _a.open, exports.readdir = _a.readdir, exports.readlink = _a.readlink, exports.rename = _a.rename, exports.rm = _a.rm, exports.rmdir = _a.rmdir, exports.stat = _a.stat, exports.symlink = _a.symlink, exports.unlink = _a.unlink;
  exports.IS_WINDOWS = process.platform === "win32";
  exports.UV_FS_O_EXLOCK = 268435456;
  exports.READONLY = fs.constants.O_RDONLY;
  function exists(fsPath) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        yield exports.stat(fsPath);
      } catch (err) {
        if (err.code === "ENOENT")
          return !1;
        throw err;
      }
      return !0;
    });
  }
  exports.exists = exists;
  function isDirectory(fsPath, useStat = !1) {
    return __awaiter(this, void 0, void 0, function* () {
      return (useStat ? yield exports.stat(fsPath) : yield exports.lstat(fsPath)).isDirectory();
    });
  }
  exports.isDirectory = isDirectory;
  function isRooted(p) {
    if (p = normalizeSeparators(p), !p)
      throw Error('isRooted() parameter "p" cannot be empty');
    if (exports.IS_WINDOWS)
      return p.startsWith("\\") || /^[A-Z]:/i.test(p);
    return p.startsWith("/");
  }
  exports.isRooted = isRooted;
  function tryGetExecutablePath(filePath, extensions) {
    return __awaiter(this, void 0, void 0, function* () {
      let stats = void 0;
      try {
        stats = yield exports.stat(filePath);
      } catch (err) {
        if (err.code !== "ENOENT")
          console.log(`Unexpected error attempting to determine if executable file exists '${filePath}': ${err}`);
      }
      if (stats && stats.isFile()) {
        if (exports.IS_WINDOWS) {
          let upperExt = path.extname(filePath).toUpperCase();
          if (extensions.some((validExt) => validExt.toUpperCase() === upperExt))
            return filePath;
        } else if (isUnixExecutable(stats))
          return filePath;
      }
      let originalFilePath = filePath;
      for (let extension of extensions) {
        filePath = originalFilePath + extension, stats = void 0;
        try {
          stats = yield exports.stat(filePath);
        } catch (err) {
          if (err.code !== "ENOENT")
            console.log(`Unexpected error attempting to determine if executable file exists '${filePath}': ${err}`);
        }
        if (stats && stats.isFile()) {
          if (exports.IS_WINDOWS) {
            try {
              let directory = path.dirname(filePath), upperName = path.basename(filePath).toUpperCase();
              for (let actualName of yield exports.readdir(directory))
                if (upperName === actualName.toUpperCase()) {
                  filePath = path.join(directory, actualName);
                  break;
                }
            } catch (err) {
              console.log(`Unexpected error attempting to determine the actual case of the file '${filePath}': ${err}`);
            }
            return filePath;
          } else if (isUnixExecutable(stats))
            return filePath;
        }
      }
      return "";
    });
  }
  exports.tryGetExecutablePath = tryGetExecutablePath;
  function normalizeSeparators(p) {
    if (p = p || "", exports.IS_WINDOWS)
      return p = p.replace(/\//g, "\\"), p.replace(/\\\\+/g, "\\");
    return p.replace(/\/\/+/g, "/");
  }
  function isUnixExecutable(stats) {
    return (stats.mode & 1) > 0 || (stats.mode & 8) > 0 && stats.gid === process.getgid() || (stats.mode & 64) > 0 && stats.uid === process.getuid();
  }
  function getCmdPath() {
    var _a2;
    return (_a2 = process.env.COMSPEC) !== null && _a2 !== void 0 ? _a2 : "cmd.exe";
  }
  exports.getCmdPath = getCmdPath;
});

// node_modules/@actions/io/lib/io.js
var require_io = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    Object.defineProperty(o, k2, { enumerable: !0, get: function() {
      return m[k];
    } });
  } : function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    o[k2] = m[k];
  }), __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: !0, value: v });
  } : function(o, v) {
    o.default = v;
  }), __importStar = exports && exports.__importStar || function(mod) {
    if (mod && mod.__esModule)
      return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod)
        if (k !== "default" && Object.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  }, __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.findInPath = exports.which = exports.mkdirP = exports.rmRF = exports.mv = exports.cp = void 0;
  var assert_1 = __require("assert"), path = __importStar(__require("path")), ioUtil = __importStar(require_io_util());
  function cp(source, dest, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
      let { force, recursive, copySourceDirectory } = readCopyOptions(options), destStat = (yield ioUtil.exists(dest)) ? yield ioUtil.stat(dest) : null;
      if (destStat && destStat.isFile() && !force)
        return;
      let newDest = destStat && destStat.isDirectory() && copySourceDirectory ? path.join(dest, path.basename(source)) : dest;
      if (!(yield ioUtil.exists(source)))
        throw Error(`no such file or directory: ${source}`);
      if ((yield ioUtil.stat(source)).isDirectory())
        if (!recursive)
          throw Error(`Failed to copy. ${source} is a directory, but tried to copy without recursive flag.`);
        else
          yield cpDirRecursive(source, newDest, 0, force);
      else {
        if (path.relative(source, newDest) === "")
          throw Error(`'${newDest}' and '${source}' are the same file`);
        yield copyFile(source, newDest, force);
      }
    });
  }
  exports.cp = cp;
  function mv(source, dest, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
      if (yield ioUtil.exists(dest)) {
        let destExists = !0;
        if (yield ioUtil.isDirectory(dest))
          dest = path.join(dest, path.basename(source)), destExists = yield ioUtil.exists(dest);
        if (destExists)
          if (options.force == null || options.force)
            yield rmRF(dest);
          else
            throw Error("Destination already exists");
      }
      yield mkdirP(path.dirname(dest)), yield ioUtil.rename(source, dest);
    });
  }
  exports.mv = mv;
  function rmRF(inputPath) {
    return __awaiter(this, void 0, void 0, function* () {
      if (ioUtil.IS_WINDOWS) {
        if (/[*"<>|]/.test(inputPath))
          throw Error('File path must not contain `*`, `"`, `<`, `>` or `|` on Windows');
      }
      try {
        yield ioUtil.rm(inputPath, {
          force: !0,
          maxRetries: 3,
          recursive: !0,
          retryDelay: 300
        });
      } catch (err) {
        throw Error(`File was unable to be removed ${err}`);
      }
    });
  }
  exports.rmRF = rmRF;
  function mkdirP(fsPath) {
    return __awaiter(this, void 0, void 0, function* () {
      assert_1.ok(fsPath, "a path argument must be provided"), yield ioUtil.mkdir(fsPath, { recursive: !0 });
    });
  }
  exports.mkdirP = mkdirP;
  function which(tool, check) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!tool)
        throw Error("parameter 'tool' is required");
      if (check) {
        let result = yield which(tool, !1);
        if (!result)
          if (ioUtil.IS_WINDOWS)
            throw Error(`Unable to locate executable file: ${tool}. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also verify the file has a valid extension for an executable file.`);
          else
            throw Error(`Unable to locate executable file: ${tool}. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable.`);
        return result;
      }
      let matches = yield findInPath(tool);
      if (matches && matches.length > 0)
        return matches[0];
      return "";
    });
  }
  exports.which = which;
  function findInPath(tool) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!tool)
        throw Error("parameter 'tool' is required");
      let extensions = [];
      if (ioUtil.IS_WINDOWS && process.env.PATHEXT) {
        for (let extension of process.env.PATHEXT.split(path.delimiter))
          if (extension)
            extensions.push(extension);
      }
      if (ioUtil.isRooted(tool)) {
        let filePath = yield ioUtil.tryGetExecutablePath(tool, extensions);
        if (filePath)
          return [filePath];
        return [];
      }
      if (tool.includes(path.sep))
        return [];
      let directories = [];
      if (process.env.PATH) {
        for (let p of process.env.PATH.split(path.delimiter))
          if (p)
            directories.push(p);
      }
      let matches = [];
      for (let directory of directories) {
        let filePath = yield ioUtil.tryGetExecutablePath(path.join(directory, tool), extensions);
        if (filePath)
          matches.push(filePath);
      }
      return matches;
    });
  }
  exports.findInPath = findInPath;
  function readCopyOptions(options) {
    let force = options.force == null ? !0 : options.force, recursive = Boolean(options.recursive), copySourceDirectory = options.copySourceDirectory == null ? !0 : Boolean(options.copySourceDirectory);
    return { force, recursive, copySourceDirectory };
  }
  function cpDirRecursive(sourceDir, destDir, currentDepth, force) {
    return __awaiter(this, void 0, void 0, function* () {
      if (currentDepth >= 255)
        return;
      currentDepth++, yield mkdirP(destDir);
      let files = yield ioUtil.readdir(sourceDir);
      for (let fileName of files) {
        let srcFile = `${sourceDir}/${fileName}`, destFile = `${destDir}/${fileName}`;
        if ((yield ioUtil.lstat(srcFile)).isDirectory())
          yield cpDirRecursive(srcFile, destFile, currentDepth, force);
        else
          yield copyFile(srcFile, destFile, force);
      }
      yield ioUtil.chmod(destDir, (yield ioUtil.stat(sourceDir)).mode);
    });
  }
  function copyFile(srcFile, destFile, force) {
    return __awaiter(this, void 0, void 0, function* () {
      if ((yield ioUtil.lstat(srcFile)).isSymbolicLink()) {
        try {
          yield ioUtil.lstat(destFile), yield ioUtil.unlink(destFile);
        } catch (e) {
          if (e.code === "EPERM")
            yield ioUtil.chmod(destFile, "0666"), yield ioUtil.unlink(destFile);
        }
        let symlinkFull = yield ioUtil.readlink(srcFile);
        yield ioUtil.symlink(symlinkFull, destFile, ioUtil.IS_WINDOWS ? "junction" : null);
      } else if (!(yield ioUtil.exists(destFile)) || force)
        yield ioUtil.copyFile(srcFile, destFile);
    });
  }
});

// node_modules/@actions/exec/lib/toolrunner.js
var require_toolrunner = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    Object.defineProperty(o, k2, { enumerable: !0, get: function() {
      return m[k];
    } });
  } : function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    o[k2] = m[k];
  }), __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: !0, value: v });
  } : function(o, v) {
    o.default = v;
  }), __importStar = exports && exports.__importStar || function(mod) {
    if (mod && mod.__esModule)
      return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod)
        if (k !== "default" && Object.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  }, __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.argStringToArray = exports.ToolRunner = void 0;
  var os = __importStar(__require("os")), events = __importStar(__require("events")), child = __importStar(__require("child_process")), path = __importStar(__require("path")), io = __importStar(require_io()), ioUtil = __importStar(require_io_util()), timers_1 = __require("timers"), IS_WINDOWS = process.platform === "win32";

  class ToolRunner extends events.EventEmitter {
    constructor(toolPath, args, options) {
      super();
      if (!toolPath)
        throw Error("Parameter 'toolPath' cannot be null or empty.");
      this.toolPath = toolPath, this.args = args || [], this.options = options || {};
    }
    _debug(message) {
      if (this.options.listeners && this.options.listeners.debug)
        this.options.listeners.debug(message);
    }
    _getCommandString(options, noPrefix) {
      let toolPath = this._getSpawnFileName(), args = this._getSpawnArgs(options), cmd = noPrefix ? "" : "[command]";
      if (IS_WINDOWS)
        if (this._isCmdFile()) {
          cmd += toolPath;
          for (let a of args)
            cmd += ` ${a}`;
        } else if (options.windowsVerbatimArguments) {
          cmd += `"${toolPath}"`;
          for (let a of args)
            cmd += ` ${a}`;
        } else {
          cmd += this._windowsQuoteCmdArg(toolPath);
          for (let a of args)
            cmd += ` ${this._windowsQuoteCmdArg(a)}`;
        }
      else {
        cmd += toolPath;
        for (let a of args)
          cmd += ` ${a}`;
      }
      return cmd;
    }
    _processLineBuffer(data, strBuffer, onLine) {
      try {
        let s = strBuffer + data.toString(), n = s.indexOf(os.EOL);
        while (n > -1) {
          let line = s.substring(0, n);
          onLine(line), s = s.substring(n + os.EOL.length), n = s.indexOf(os.EOL);
        }
        return s;
      } catch (err) {
        return this._debug(`error processing line. Failed with error ${err}`), "";
      }
    }
    _getSpawnFileName() {
      if (IS_WINDOWS) {
        if (this._isCmdFile())
          return process.env.COMSPEC || "cmd.exe";
      }
      return this.toolPath;
    }
    _getSpawnArgs(options) {
      if (IS_WINDOWS) {
        if (this._isCmdFile()) {
          let argline = `/D /S /C "${this._windowsQuoteCmdArg(this.toolPath)}`;
          for (let a of this.args)
            argline += " ", argline += options.windowsVerbatimArguments ? a : this._windowsQuoteCmdArg(a);
          return argline += '"', [argline];
        }
      }
      return this.args;
    }
    _endsWith(str, end) {
      return str.endsWith(end);
    }
    _isCmdFile() {
      let upperToolPath = this.toolPath.toUpperCase();
      return this._endsWith(upperToolPath, ".CMD") || this._endsWith(upperToolPath, ".BAT");
    }
    _windowsQuoteCmdArg(arg) {
      if (!this._isCmdFile())
        return this._uvQuoteCmdArg(arg);
      if (!arg)
        return '""';
      let cmdSpecialChars = [
        " ",
        "\t",
        "&",
        "(",
        ")",
        "[",
        "]",
        "{",
        "}",
        "^",
        "=",
        ";",
        "!",
        "'",
        "+",
        ",",
        "`",
        "~",
        "|",
        "<",
        ">",
        '"'
      ], needsQuotes = !1;
      for (let char of arg)
        if (cmdSpecialChars.some((x) => x === char)) {
          needsQuotes = !0;
          break;
        }
      if (!needsQuotes)
        return arg;
      let reverse = '"', quoteHit = !0;
      for (let i = arg.length;i > 0; i--)
        if (reverse += arg[i - 1], quoteHit && arg[i - 1] === "\\")
          reverse += "\\";
        else if (arg[i - 1] === '"')
          quoteHit = !0, reverse += '"';
        else
          quoteHit = !1;
      return reverse += '"', reverse.split("").reverse().join("");
    }
    _uvQuoteCmdArg(arg) {
      if (!arg)
        return '""';
      if (!arg.includes(" ") && !arg.includes("\t") && !arg.includes('"'))
        return arg;
      if (!arg.includes('"') && !arg.includes("\\"))
        return `"${arg}"`;
      let reverse = '"', quoteHit = !0;
      for (let i = arg.length;i > 0; i--)
        if (reverse += arg[i - 1], quoteHit && arg[i - 1] === "\\")
          reverse += "\\";
        else if (arg[i - 1] === '"')
          quoteHit = !0, reverse += "\\";
        else
          quoteHit = !1;
      return reverse += '"', reverse.split("").reverse().join("");
    }
    _cloneExecOptions(options) {
      options = options || {};
      let result = {
        cwd: options.cwd || process.cwd(),
        env: options.env || process.env,
        silent: options.silent || !1,
        windowsVerbatimArguments: options.windowsVerbatimArguments || !1,
        failOnStdErr: options.failOnStdErr || !1,
        ignoreReturnCode: options.ignoreReturnCode || !1,
        delay: options.delay || 1e4
      };
      return result.outStream = options.outStream || process.stdout, result.errStream = options.errStream || process.stderr, result;
    }
    _getSpawnOptions(options, toolPath) {
      options = options || {};
      let result = {};
      if (result.cwd = options.cwd, result.env = options.env, result.windowsVerbatimArguments = options.windowsVerbatimArguments || this._isCmdFile(), options.windowsVerbatimArguments)
        result.argv0 = `"${toolPath}"`;
      return result;
    }
    exec() {
      return __awaiter(this, void 0, void 0, function* () {
        if (!ioUtil.isRooted(this.toolPath) && (this.toolPath.includes("/") || IS_WINDOWS && this.toolPath.includes("\\")))
          this.toolPath = path.resolve(process.cwd(), this.options.cwd || process.cwd(), this.toolPath);
        return this.toolPath = yield io.which(this.toolPath, !0), new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
          this._debug(`exec tool: ${this.toolPath}`), this._debug("arguments:");
          for (let arg of this.args)
            this._debug(`   ${arg}`);
          let optionsNonNull = this._cloneExecOptions(this.options);
          if (!optionsNonNull.silent && optionsNonNull.outStream)
            optionsNonNull.outStream.write(this._getCommandString(optionsNonNull) + os.EOL);
          let state = new ExecState(optionsNonNull, this.toolPath);
          if (state.on("debug", (message) => {
            this._debug(message);
          }), this.options.cwd && !(yield ioUtil.exists(this.options.cwd)))
            return reject(Error(`The cwd: ${this.options.cwd} does not exist!`));
          let fileName = this._getSpawnFileName(), cp = child.spawn(fileName, this._getSpawnArgs(optionsNonNull), this._getSpawnOptions(this.options, fileName)), stdbuffer = "";
          if (cp.stdout)
            cp.stdout.on("data", (data) => {
              if (this.options.listeners && this.options.listeners.stdout)
                this.options.listeners.stdout(data);
              if (!optionsNonNull.silent && optionsNonNull.outStream)
                optionsNonNull.outStream.write(data);
              stdbuffer = this._processLineBuffer(data, stdbuffer, (line) => {
                if (this.options.listeners && this.options.listeners.stdline)
                  this.options.listeners.stdline(line);
              });
            });
          let errbuffer = "";
          if (cp.stderr)
            cp.stderr.on("data", (data) => {
              if (state.processStderr = !0, this.options.listeners && this.options.listeners.stderr)
                this.options.listeners.stderr(data);
              if (!optionsNonNull.silent && optionsNonNull.errStream && optionsNonNull.outStream)
                (optionsNonNull.failOnStdErr ? optionsNonNull.errStream : optionsNonNull.outStream).write(data);
              errbuffer = this._processLineBuffer(data, errbuffer, (line) => {
                if (this.options.listeners && this.options.listeners.errline)
                  this.options.listeners.errline(line);
              });
            });
          if (cp.on("error", (err) => {
            state.processError = err.message, state.processExited = !0, state.processClosed = !0, state.CheckComplete();
          }), cp.on("exit", (code) => {
            state.processExitCode = code, state.processExited = !0, this._debug(`Exit code ${code} received from tool '${this.toolPath}'`), state.CheckComplete();
          }), cp.on("close", (code) => {
            state.processExitCode = code, state.processExited = !0, state.processClosed = !0, this._debug(`STDIO streams have closed for tool '${this.toolPath}'`), state.CheckComplete();
          }), state.on("done", (error, exitCode) => {
            if (stdbuffer.length > 0)
              this.emit("stdline", stdbuffer);
            if (errbuffer.length > 0)
              this.emit("errline", errbuffer);
            if (cp.removeAllListeners(), error)
              reject(error);
            else
              resolve(exitCode);
          }), this.options.input) {
            if (!cp.stdin)
              throw Error("child process missing stdin");
            cp.stdin.end(this.options.input);
          }
        }));
      });
    }
  }
  exports.ToolRunner = ToolRunner;
  function argStringToArray(argString) {
    let args = [], inQuotes = !1, escaped = !1, arg = "";
    function append(c) {
      if (escaped && c !== '"')
        arg += "\\";
      arg += c, escaped = !1;
    }
    for (let i = 0;i < argString.length; i++) {
      let c = argString.charAt(i);
      if (c === '"') {
        if (!escaped)
          inQuotes = !inQuotes;
        else
          append(c);
        continue;
      }
      if (c === "\\" && escaped) {
        append(c);
        continue;
      }
      if (c === "\\" && inQuotes) {
        escaped = !0;
        continue;
      }
      if (c === " " && !inQuotes) {
        if (arg.length > 0)
          args.push(arg), arg = "";
        continue;
      }
      append(c);
    }
    if (arg.length > 0)
      args.push(arg.trim());
    return args;
  }
  exports.argStringToArray = argStringToArray;

  class ExecState extends events.EventEmitter {
    constructor(options, toolPath) {
      super();
      if (this.processClosed = !1, this.processError = "", this.processExitCode = 0, this.processExited = !1, this.processStderr = !1, this.delay = 1e4, this.done = !1, this.timeout = null, !toolPath)
        throw Error("toolPath must not be empty");
      if (this.options = options, this.toolPath = toolPath, options.delay)
        this.delay = options.delay;
    }
    CheckComplete() {
      if (this.done)
        return;
      if (this.processClosed)
        this._setResult();
      else if (this.processExited)
        this.timeout = timers_1.setTimeout(ExecState.HandleTimeout, this.delay, this);
    }
    _debug(message) {
      this.emit("debug", message);
    }
    _setResult() {
      let error;
      if (this.processExited) {
        if (this.processError)
          error = Error(`There was an error when attempting to execute the process '${this.toolPath}'. This may indicate the process failed to start. Error: ${this.processError}`);
        else if (this.processExitCode !== 0 && !this.options.ignoreReturnCode)
          error = Error(`The process '${this.toolPath}' failed with exit code ${this.processExitCode}`);
        else if (this.processStderr && this.options.failOnStdErr)
          error = Error(`The process '${this.toolPath}' failed because one or more lines were written to the STDERR stream`);
      }
      if (this.timeout)
        clearTimeout(this.timeout), this.timeout = null;
      this.done = !0, this.emit("done", error, this.processExitCode);
    }
    static HandleTimeout(state) {
      if (state.done)
        return;
      if (!state.processClosed && state.processExited) {
        let message = `The STDIO streams did not close within ${state.delay / 1000} seconds of the exit event from process '${state.toolPath}'. This may indicate a child process inherited the STDIO streams and has not yet exited.`;
        state._debug(message);
      }
      state._setResult();
    }
  }
});

// node_modules/@actions/exec/lib/exec.js
var require_exec = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    Object.defineProperty(o, k2, { enumerable: !0, get: function() {
      return m[k];
    } });
  } : function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    o[k2] = m[k];
  }), __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: !0, value: v });
  } : function(o, v) {
    o.default = v;
  }), __importStar = exports && exports.__importStar || function(mod) {
    if (mod && mod.__esModule)
      return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod)
        if (k !== "default" && Object.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  }, __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.getExecOutput = exports.exec = void 0;
  var string_decoder_1 = __require("string_decoder"), tr = __importStar(require_toolrunner());
  function exec(commandLine, args, options) {
    return __awaiter(this, void 0, void 0, function* () {
      let commandArgs = tr.argStringToArray(commandLine);
      if (commandArgs.length === 0)
        throw Error("Parameter 'commandLine' cannot be null or empty.");
      let toolPath = commandArgs[0];
      return args = commandArgs.slice(1).concat(args || []), new tr.ToolRunner(toolPath, args, options).exec();
    });
  }
  exports.exec = exec;
  function getExecOutput(commandLine, args, options) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
      let stdout = "", stderr = "", stdoutDecoder = new string_decoder_1.StringDecoder("utf8"), stderrDecoder = new string_decoder_1.StringDecoder("utf8"), originalStdoutListener = (_a = options === null || options === void 0 ? void 0 : options.listeners) === null || _a === void 0 ? void 0 : _a.stdout, originalStdErrListener = (_b = options === null || options === void 0 ? void 0 : options.listeners) === null || _b === void 0 ? void 0 : _b.stderr, stdErrListener = (data) => {
        if (stderr += stderrDecoder.write(data), originalStdErrListener)
          originalStdErrListener(data);
      }, stdOutListener = (data) => {
        if (stdout += stdoutDecoder.write(data), originalStdoutListener)
          originalStdoutListener(data);
      }, listeners = Object.assign(Object.assign({}, options === null || options === void 0 ? void 0 : options.listeners), { stdout: stdOutListener, stderr: stdErrListener }), exitCode = yield exec(commandLine, args, Object.assign(Object.assign({}, options), { listeners }));
      return stdout += stdoutDecoder.end(), stderr += stderrDecoder.end(), {
        exitCode,
        stdout,
        stderr
      };
    });
  }
  exports.getExecOutput = getExecOutput;
});

export { require_exec };

//# debugId=21229072A91DE52964756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vbm9kZV9tb2R1bGVzL0BhY3Rpb25zL2lvL2xpYi9pby11dGlsLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9pby9saWIvaW8uanMiLCAiLi4vbm9kZV9tb2R1bGVzL0BhY3Rpb25zL2V4ZWMvbGliL3Rvb2xydW5uZXIuanMiLCAiLi4vbm9kZV9tb2R1bGVzL0BhY3Rpb25zL2V4ZWMvbGliL2V4ZWMuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfSk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xufSk7XG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG52YXIgX2E7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmdldENtZFBhdGggPSBleHBvcnRzLnRyeUdldEV4ZWN1dGFibGVQYXRoID0gZXhwb3J0cy5pc1Jvb3RlZCA9IGV4cG9ydHMuaXNEaXJlY3RvcnkgPSBleHBvcnRzLmV4aXN0cyA9IGV4cG9ydHMuUkVBRE9OTFkgPSBleHBvcnRzLlVWX0ZTX09fRVhMT0NLID0gZXhwb3J0cy5JU19XSU5ET1dTID0gZXhwb3J0cy51bmxpbmsgPSBleHBvcnRzLnN5bWxpbmsgPSBleHBvcnRzLnN0YXQgPSBleHBvcnRzLnJtZGlyID0gZXhwb3J0cy5ybSA9IGV4cG9ydHMucmVuYW1lID0gZXhwb3J0cy5yZWFkbGluayA9IGV4cG9ydHMucmVhZGRpciA9IGV4cG9ydHMub3BlbiA9IGV4cG9ydHMubWtkaXIgPSBleHBvcnRzLmxzdGF0ID0gZXhwb3J0cy5jb3B5RmlsZSA9IGV4cG9ydHMuY2htb2QgPSB2b2lkIDA7XG5jb25zdCBmcyA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwiZnNcIikpO1xuY29uc3QgcGF0aCA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwicGF0aFwiKSk7XG5fYSA9IGZzLnByb21pc2VzXG4vLyBleHBvcnQgY29uc3Qge29wZW59ID0gJ2ZzJ1xuLCBleHBvcnRzLmNobW9kID0gX2EuY2htb2QsIGV4cG9ydHMuY29weUZpbGUgPSBfYS5jb3B5RmlsZSwgZXhwb3J0cy5sc3RhdCA9IF9hLmxzdGF0LCBleHBvcnRzLm1rZGlyID0gX2EubWtkaXIsIGV4cG9ydHMub3BlbiA9IF9hLm9wZW4sIGV4cG9ydHMucmVhZGRpciA9IF9hLnJlYWRkaXIsIGV4cG9ydHMucmVhZGxpbmsgPSBfYS5yZWFkbGluaywgZXhwb3J0cy5yZW5hbWUgPSBfYS5yZW5hbWUsIGV4cG9ydHMucm0gPSBfYS5ybSwgZXhwb3J0cy5ybWRpciA9IF9hLnJtZGlyLCBleHBvcnRzLnN0YXQgPSBfYS5zdGF0LCBleHBvcnRzLnN5bWxpbmsgPSBfYS5zeW1saW5rLCBleHBvcnRzLnVubGluayA9IF9hLnVubGluaztcbi8vIGV4cG9ydCBjb25zdCB7b3Blbn0gPSAnZnMnXG5leHBvcnRzLklTX1dJTkRPV1MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9ibG9iL2QwMTUzYWVlMzY3NDIyZDA4NTgxMDVhYmVjMTg2ZGE0ZGZmMGEwYzUvZGVwcy91di9pbmNsdWRlL3V2L3dpbi5oI0w2OTFcbmV4cG9ydHMuVVZfRlNfT19FWExPQ0sgPSAweDEwMDAwMDAwO1xuZXhwb3J0cy5SRUFET05MWSA9IGZzLmNvbnN0YW50cy5PX1JET05MWTtcbmZ1bmN0aW9uIGV4aXN0cyhmc1BhdGgpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgeWllbGQgZXhwb3J0cy5zdGF0KGZzUGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZXhpc3RzID0gZXhpc3RzO1xuZnVuY3Rpb24gaXNEaXJlY3RvcnkoZnNQYXRoLCB1c2VTdGF0ID0gZmFsc2UpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHVzZVN0YXQgPyB5aWVsZCBleHBvcnRzLnN0YXQoZnNQYXRoKSA6IHlpZWxkIGV4cG9ydHMubHN0YXQoZnNQYXRoKTtcbiAgICAgICAgcmV0dXJuIHN0YXRzLmlzRGlyZWN0b3J5KCk7XG4gICAgfSk7XG59XG5leHBvcnRzLmlzRGlyZWN0b3J5ID0gaXNEaXJlY3Rvcnk7XG4vKipcbiAqIE9uIE9TWC9MaW51eCwgdHJ1ZSBpZiBwYXRoIHN0YXJ0cyB3aXRoICcvJy4gT24gV2luZG93cywgdHJ1ZSBmb3IgcGF0aHMgbGlrZTpcbiAqIFxcLCBcXGhlbGxvLCBcXFxcaGVsbG9cXHNoYXJlLCBDOiwgYW5kIEM6XFxoZWxsbyAoYW5kIGNvcnJlc3BvbmRpbmcgYWx0ZXJuYXRlIHNlcGFyYXRvciBjYXNlcykuXG4gKi9cbmZ1bmN0aW9uIGlzUm9vdGVkKHApIHtcbiAgICBwID0gbm9ybWFsaXplU2VwYXJhdG9ycyhwKTtcbiAgICBpZiAoIXApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpc1Jvb3RlZCgpIHBhcmFtZXRlciBcInBcIiBjYW5ub3QgYmUgZW1wdHknKTtcbiAgICB9XG4gICAgaWYgKGV4cG9ydHMuSVNfV0lORE9XUykge1xuICAgICAgICByZXR1cm4gKHAuc3RhcnRzV2l0aCgnXFxcXCcpIHx8IC9eW0EtWl06L2kudGVzdChwKSAvLyBlLmcuIFxcIG9yIFxcaGVsbG8gb3IgXFxcXGhlbGxvXG4gICAgICAgICk7IC8vIGUuZy4gQzogb3IgQzpcXGhlbGxvXG4gICAgfVxuICAgIHJldHVybiBwLnN0YXJ0c1dpdGgoJy8nKTtcbn1cbmV4cG9ydHMuaXNSb290ZWQgPSBpc1Jvb3RlZDtcbi8qKlxuICogQmVzdCBlZmZvcnQgYXR0ZW1wdCB0byBkZXRlcm1pbmUgd2hldGhlciBhIGZpbGUgZXhpc3RzIGFuZCBpcyBleGVjdXRhYmxlLlxuICogQHBhcmFtIGZpbGVQYXRoICAgIGZpbGUgcGF0aCB0byBjaGVja1xuICogQHBhcmFtIGV4dGVuc2lvbnMgIGFkZGl0aW9uYWwgZmlsZSBleHRlbnNpb25zIHRvIHRyeVxuICogQHJldHVybiBpZiBmaWxlIGV4aXN0cyBhbmQgaXMgZXhlY3V0YWJsZSwgcmV0dXJucyB0aGUgZmlsZSBwYXRoLiBvdGhlcndpc2UgZW1wdHkgc3RyaW5nLlxuICovXG5mdW5jdGlvbiB0cnlHZXRFeGVjdXRhYmxlUGF0aChmaWxlUGF0aCwgZXh0ZW5zaW9ucykge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGxldCBzdGF0cyA9IHVuZGVmaW5lZDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHRlc3QgZmlsZSBleGlzdHNcbiAgICAgICAgICAgIHN0YXRzID0geWllbGQgZXhwb3J0cy5zdGF0KGZpbGVQYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVW5leHBlY3RlZCBlcnJvciBhdHRlbXB0aW5nIHRvIGRldGVybWluZSBpZiBleGVjdXRhYmxlIGZpbGUgZXhpc3RzICcke2ZpbGVQYXRofSc6ICR7ZXJyfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0cyAmJiBzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgaWYgKGV4cG9ydHMuSVNfV0lORE9XUykge1xuICAgICAgICAgICAgICAgIC8vIG9uIFdpbmRvd3MsIHRlc3QgZm9yIHZhbGlkIGV4dGVuc2lvblxuICAgICAgICAgICAgICAgIGNvbnN0IHVwcGVyRXh0ID0gcGF0aC5leHRuYW1lKGZpbGVQYXRoKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb25zLnNvbWUodmFsaWRFeHQgPT4gdmFsaWRFeHQudG9VcHBlckNhc2UoKSA9PT0gdXBwZXJFeHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWxlUGF0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNVbml4RXhlY3V0YWJsZShzdGF0cykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVQYXRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyB0cnkgZWFjaCBleHRlbnNpb25cbiAgICAgICAgY29uc3Qgb3JpZ2luYWxGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgICBmb3IgKGNvbnN0IGV4dGVuc2lvbiBvZiBleHRlbnNpb25zKSB7XG4gICAgICAgICAgICBmaWxlUGF0aCA9IG9yaWdpbmFsRmlsZVBhdGggKyBleHRlbnNpb247XG4gICAgICAgICAgICBzdGF0cyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc3RhdHMgPSB5aWVsZCBleHBvcnRzLnN0YXQoZmlsZVBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVuZXhwZWN0ZWQgZXJyb3IgYXR0ZW1wdGluZyB0byBkZXRlcm1pbmUgaWYgZXhlY3V0YWJsZSBmaWxlIGV4aXN0cyAnJHtmaWxlUGF0aH0nOiAke2Vycn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RhdHMgJiYgc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXhwb3J0cy5JU19XSU5ET1dTKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHByZXNlcnZlIHRoZSBjYXNlIG9mIHRoZSBhY3R1YWwgZmlsZSAoc2luY2UgYW4gZXh0ZW5zaW9uIHdhcyBhcHBlbmRlZClcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpcmVjdG9yeSA9IHBhdGguZGlybmFtZShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cHBlck5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3R1YWxOYW1lIG9mIHlpZWxkIGV4cG9ydHMucmVhZGRpcihkaXJlY3RvcnkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVwcGVyTmFtZSA9PT0gYWN0dWFsTmFtZS50b1VwcGVyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKGRpcmVjdG9yeSwgYWN0dWFsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVuZXhwZWN0ZWQgZXJyb3IgYXR0ZW1wdGluZyB0byBkZXRlcm1pbmUgdGhlIGFjdHVhbCBjYXNlIG9mIHRoZSBmaWxlICcke2ZpbGVQYXRofSc6ICR7ZXJyfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWxlUGF0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1VuaXhFeGVjdXRhYmxlKHN0YXRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVQYXRoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9KTtcbn1cbmV4cG9ydHMudHJ5R2V0RXhlY3V0YWJsZVBhdGggPSB0cnlHZXRFeGVjdXRhYmxlUGF0aDtcbmZ1bmN0aW9uIG5vcm1hbGl6ZVNlcGFyYXRvcnMocCkge1xuICAgIHAgPSBwIHx8ICcnO1xuICAgIGlmIChleHBvcnRzLklTX1dJTkRPV1MpIHtcbiAgICAgICAgLy8gY29udmVydCBzbGFzaGVzIG9uIFdpbmRvd3NcbiAgICAgICAgcCA9IHAucmVwbGFjZSgvXFwvL2csICdcXFxcJyk7XG4gICAgICAgIC8vIHJlbW92ZSByZWR1bmRhbnQgc2xhc2hlc1xuICAgICAgICByZXR1cm4gcC5yZXBsYWNlKC9cXFxcXFxcXCsvZywgJ1xcXFwnKTtcbiAgICB9XG4gICAgLy8gcmVtb3ZlIHJlZHVuZGFudCBzbGFzaGVzXG4gICAgcmV0dXJuIHAucmVwbGFjZSgvXFwvXFwvKy9nLCAnLycpO1xufVxuLy8gb24gTWFjL0xpbnV4LCB0ZXN0IHRoZSBleGVjdXRlIGJpdFxuLy8gICAgIFIgICBXICBYICBSICBXIFggUiBXIFhcbi8vICAgMjU2IDEyOCA2NCAzMiAxNiA4IDQgMiAxXG5mdW5jdGlvbiBpc1VuaXhFeGVjdXRhYmxlKHN0YXRzKSB7XG4gICAgcmV0dXJuICgoc3RhdHMubW9kZSAmIDEpID4gMCB8fFxuICAgICAgICAoKHN0YXRzLm1vZGUgJiA4KSA+IDAgJiYgc3RhdHMuZ2lkID09PSBwcm9jZXNzLmdldGdpZCgpKSB8fFxuICAgICAgICAoKHN0YXRzLm1vZGUgJiA2NCkgPiAwICYmIHN0YXRzLnVpZCA9PT0gcHJvY2Vzcy5nZXR1aWQoKSkpO1xufVxuLy8gR2V0IHRoZSBwYXRoIG9mIGNtZC5leGUgaW4gd2luZG93c1xuZnVuY3Rpb24gZ2V0Q21kUGF0aCgpIHtcbiAgICB2YXIgX2E7XG4gICAgcmV0dXJuIChfYSA9IHByb2Nlc3MuZW52WydDT01TUEVDJ10pICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IGBjbWQuZXhlYDtcbn1cbmV4cG9ydHMuZ2V0Q21kUGF0aCA9IGdldENtZFBhdGg7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pby11dGlsLmpzLm1hcCIsCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfSk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xufSk7XG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmZpbmRJblBhdGggPSBleHBvcnRzLndoaWNoID0gZXhwb3J0cy5ta2RpclAgPSBleHBvcnRzLnJtUkYgPSBleHBvcnRzLm12ID0gZXhwb3J0cy5jcCA9IHZvaWQgMDtcbmNvbnN0IGFzc2VydF8xID0gcmVxdWlyZShcImFzc2VydFwiKTtcbmNvbnN0IHBhdGggPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcInBhdGhcIikpO1xuY29uc3QgaW9VdGlsID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCIuL2lvLXV0aWxcIikpO1xuLyoqXG4gKiBDb3BpZXMgYSBmaWxlIG9yIGZvbGRlci5cbiAqIEJhc2VkIG9mZiBvZiBzaGVsbGpzIC0gaHR0cHM6Ly9naXRodWIuY29tL3NoZWxsanMvc2hlbGxqcy9ibG9iLzkyMzdmNjZjNTJlNWRhYTQwNDU4Zjk0Zjk1NjVlMThlODEzMmY1YTYvc3JjL2NwLmpzXG4gKlxuICogQHBhcmFtICAgICBzb3VyY2UgICAgc291cmNlIHBhdGhcbiAqIEBwYXJhbSAgICAgZGVzdCAgICAgIGRlc3RpbmF0aW9uIHBhdGhcbiAqIEBwYXJhbSAgICAgb3B0aW9ucyAgIG9wdGlvbmFsLiBTZWUgQ29weU9wdGlvbnMuXG4gKi9cbmZ1bmN0aW9uIGNwKHNvdXJjZSwgZGVzdCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgY29uc3QgeyBmb3JjZSwgcmVjdXJzaXZlLCBjb3B5U291cmNlRGlyZWN0b3J5IH0gPSByZWFkQ29weU9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGRlc3RTdGF0ID0gKHlpZWxkIGlvVXRpbC5leGlzdHMoZGVzdCkpID8geWllbGQgaW9VdGlsLnN0YXQoZGVzdCkgOiBudWxsO1xuICAgICAgICAvLyBEZXN0IGlzIGFuIGV4aXN0aW5nIGZpbGUsIGJ1dCBub3QgZm9yY2luZ1xuICAgICAgICBpZiAoZGVzdFN0YXQgJiYgZGVzdFN0YXQuaXNGaWxlKCkgJiYgIWZvcmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgZGVzdCBpcyBhbiBleGlzdGluZyBkaXJlY3RvcnksIHNob3VsZCBjb3B5IGluc2lkZS5cbiAgICAgICAgY29uc3QgbmV3RGVzdCA9IGRlc3RTdGF0ICYmIGRlc3RTdGF0LmlzRGlyZWN0b3J5KCkgJiYgY29weVNvdXJjZURpcmVjdG9yeVxuICAgICAgICAgICAgPyBwYXRoLmpvaW4oZGVzdCwgcGF0aC5iYXNlbmFtZShzb3VyY2UpKVxuICAgICAgICAgICAgOiBkZXN0O1xuICAgICAgICBpZiAoISh5aWVsZCBpb1V0aWwuZXhpc3RzKHNvdXJjZSkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIHN1Y2ggZmlsZSBvciBkaXJlY3Rvcnk6ICR7c291cmNlfWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNvdXJjZVN0YXQgPSB5aWVsZCBpb1V0aWwuc3RhdChzb3VyY2UpO1xuICAgICAgICBpZiAoc291cmNlU3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICBpZiAoIXJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGNvcHkuICR7c291cmNlfSBpcyBhIGRpcmVjdG9yeSwgYnV0IHRyaWVkIHRvIGNvcHkgd2l0aG91dCByZWN1cnNpdmUgZmxhZy5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHlpZWxkIGNwRGlyUmVjdXJzaXZlKHNvdXJjZSwgbmV3RGVzdCwgMCwgZm9yY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKHBhdGgucmVsYXRpdmUoc291cmNlLCBuZXdEZXN0KSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBhIGZpbGUgY2Fubm90IGJlIGNvcGllZCB0byBpdHNlbGZcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCcke25ld0Rlc3R9JyBhbmQgJyR7c291cmNlfScgYXJlIHRoZSBzYW1lIGZpbGVgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHlpZWxkIGNvcHlGaWxlKHNvdXJjZSwgbmV3RGVzdCwgZm9yY2UpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5leHBvcnRzLmNwID0gY3A7XG4vKipcbiAqIE1vdmVzIGEgcGF0aC5cbiAqXG4gKiBAcGFyYW0gICAgIHNvdXJjZSAgICBzb3VyY2UgcGF0aFxuICogQHBhcmFtICAgICBkZXN0ICAgICAgZGVzdGluYXRpb24gcGF0aFxuICogQHBhcmFtICAgICBvcHRpb25zICAgb3B0aW9uYWwuIFNlZSBNb3ZlT3B0aW9ucy5cbiAqL1xuZnVuY3Rpb24gbXYoc291cmNlLCBkZXN0LCBvcHRpb25zID0ge30pIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBpZiAoeWllbGQgaW9VdGlsLmV4aXN0cyhkZXN0KSkge1xuICAgICAgICAgICAgbGV0IGRlc3RFeGlzdHMgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKHlpZWxkIGlvVXRpbC5pc0RpcmVjdG9yeShkZXN0KSkge1xuICAgICAgICAgICAgICAgIC8vIElmIGRlc3QgaXMgZGlyZWN0b3J5IGNvcHkgc3JjIGludG8gZGVzdFxuICAgICAgICAgICAgICAgIGRlc3QgPSBwYXRoLmpvaW4oZGVzdCwgcGF0aC5iYXNlbmFtZShzb3VyY2UpKTtcbiAgICAgICAgICAgICAgICBkZXN0RXhpc3RzID0geWllbGQgaW9VdGlsLmV4aXN0cyhkZXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkZXN0RXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZm9yY2UgPT0gbnVsbCB8fCBvcHRpb25zLmZvcmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHlpZWxkIHJtUkYoZGVzdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Rlc3RpbmF0aW9uIGFscmVhZHkgZXhpc3RzJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHlpZWxkIG1rZGlyUChwYXRoLmRpcm5hbWUoZGVzdCkpO1xuICAgICAgICB5aWVsZCBpb1V0aWwucmVuYW1lKHNvdXJjZSwgZGVzdCk7XG4gICAgfSk7XG59XG5leHBvcnRzLm12ID0gbXY7XG4vKipcbiAqIFJlbW92ZSBhIHBhdGggcmVjdXJzaXZlbHkgd2l0aCBmb3JjZVxuICpcbiAqIEBwYXJhbSBpbnB1dFBhdGggcGF0aCB0byByZW1vdmVcbiAqL1xuZnVuY3Rpb24gcm1SRihpbnB1dFBhdGgpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBpZiAoaW9VdGlsLklTX1dJTkRPV1MpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBpbnZhbGlkIGNoYXJhY3RlcnNcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL3dpbmRvd3Mvd2luMzIvZmlsZWlvL25hbWluZy1hLWZpbGVcbiAgICAgICAgICAgIGlmICgvWypcIjw+fF0vLnRlc3QoaW5wdXRQYXRoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRmlsZSBwYXRoIG11c3Qgbm90IGNvbnRhaW4gYCpgLCBgXCJgLCBgPGAsIGA+YCBvciBgfGAgb24gV2luZG93cycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBub3RlIGlmIHBhdGggZG9lcyBub3QgZXhpc3QsIGVycm9yIGlzIHNpbGVudFxuICAgICAgICAgICAgeWllbGQgaW9VdGlsLnJtKGlucHV0UGF0aCwge1xuICAgICAgICAgICAgICAgIGZvcmNlOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgICAgICAgICAgICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJldHJ5RGVsYXk6IDMwMFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHdhcyB1bmFibGUgdG8gYmUgcmVtb3ZlZCAke2Vycn1gKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuZXhwb3J0cy5ybVJGID0gcm1SRjtcbi8qKlxuICogTWFrZSBhIGRpcmVjdG9yeS4gIENyZWF0ZXMgdGhlIGZ1bGwgcGF0aCB3aXRoIGZvbGRlcnMgaW4gYmV0d2VlblxuICogV2lsbCB0aHJvdyBpZiBpdCBmYWlsc1xuICpcbiAqIEBwYXJhbSAgIGZzUGF0aCAgICAgICAgcGF0aCB0byBjcmVhdGVcbiAqIEByZXR1cm5zIFByb21pc2U8dm9pZD5cbiAqL1xuZnVuY3Rpb24gbWtkaXJQKGZzUGF0aCkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGFzc2VydF8xLm9rKGZzUGF0aCwgJ2EgcGF0aCBhcmd1bWVudCBtdXN0IGJlIHByb3ZpZGVkJyk7XG4gICAgICAgIHlpZWxkIGlvVXRpbC5ta2Rpcihmc1BhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIH0pO1xufVxuZXhwb3J0cy5ta2RpclAgPSBta2RpclA7XG4vKipcbiAqIFJldHVybnMgcGF0aCBvZiBhIHRvb2wgaGFkIHRoZSB0b29sIGFjdHVhbGx5IGJlZW4gaW52b2tlZC4gIFJlc29sdmVzIHZpYSBwYXRocy5cbiAqIElmIHlvdSBjaGVjayBhbmQgdGhlIHRvb2wgZG9lcyBub3QgZXhpc3QsIGl0IHdpbGwgdGhyb3cuXG4gKlxuICogQHBhcmFtICAgICB0b29sICAgICAgICAgICAgICBuYW1lIG9mIHRoZSB0b29sXG4gKiBAcGFyYW0gICAgIGNoZWNrICAgICAgICAgICAgIHdoZXRoZXIgdG8gY2hlY2sgaWYgdG9vbCBleGlzdHNcbiAqIEByZXR1cm5zICAgUHJvbWlzZTxzdHJpbmc+ICAgcGF0aCB0byB0b29sXG4gKi9cbmZ1bmN0aW9uIHdoaWNoKHRvb2wsIGNoZWNrKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgaWYgKCF0b29sKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwYXJhbWV0ZXIgJ3Rvb2wnIGlzIHJlcXVpcmVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHJlY3Vyc2l2ZSB3aGVuIGNoZWNrPXRydWVcbiAgICAgICAgaWYgKGNoZWNrKSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB5aWVsZCB3aGljaCh0b29sLCBmYWxzZSk7XG4gICAgICAgICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGlmIChpb1V0aWwuSVNfV0lORE9XUykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBsb2NhdGUgZXhlY3V0YWJsZSBmaWxlOiAke3Rvb2x9LiBQbGVhc2UgdmVyaWZ5IGVpdGhlciB0aGUgZmlsZSBwYXRoIGV4aXN0cyBvciB0aGUgZmlsZSBjYW4gYmUgZm91bmQgd2l0aGluIGEgZGlyZWN0b3J5IHNwZWNpZmllZCBieSB0aGUgUEFUSCBlbnZpcm9ubWVudCB2YXJpYWJsZS4gQWxzbyB2ZXJpZnkgdGhlIGZpbGUgaGFzIGEgdmFsaWQgZXh0ZW5zaW9uIGZvciBhbiBleGVjdXRhYmxlIGZpbGUuYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBsb2NhdGUgZXhlY3V0YWJsZSBmaWxlOiAke3Rvb2x9LiBQbGVhc2UgdmVyaWZ5IGVpdGhlciB0aGUgZmlsZSBwYXRoIGV4aXN0cyBvciB0aGUgZmlsZSBjYW4gYmUgZm91bmQgd2l0aGluIGEgZGlyZWN0b3J5IHNwZWNpZmllZCBieSB0aGUgUEFUSCBlbnZpcm9ubWVudCB2YXJpYWJsZS4gQWxzbyBjaGVjayB0aGUgZmlsZSBtb2RlIHRvIHZlcmlmeSB0aGUgZmlsZSBpcyBleGVjdXRhYmxlLmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWF0Y2hlcyA9IHlpZWxkIGZpbmRJblBhdGgodG9vbCk7XG4gICAgICAgIGlmIChtYXRjaGVzICYmIG1hdGNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoZXNbMF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0pO1xufVxuZXhwb3J0cy53aGljaCA9IHdoaWNoO1xuLyoqXG4gKiBSZXR1cm5zIGEgbGlzdCBvZiBhbGwgb2NjdXJyZW5jZXMgb2YgdGhlIGdpdmVuIHRvb2wgb24gdGhlIHN5c3RlbSBwYXRoLlxuICpcbiAqIEByZXR1cm5zICAgUHJvbWlzZTxzdHJpbmdbXT4gIHRoZSBwYXRocyBvZiB0aGUgdG9vbFxuICovXG5mdW5jdGlvbiBmaW5kSW5QYXRoKHRvb2wpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBpZiAoIXRvb2wpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInBhcmFtZXRlciAndG9vbCcgaXMgcmVxdWlyZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYnVpbGQgdGhlIGxpc3Qgb2YgZXh0ZW5zaW9ucyB0byB0cnlcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9ucyA9IFtdO1xuICAgICAgICBpZiAoaW9VdGlsLklTX1dJTkRPV1MgJiYgcHJvY2Vzcy5lbnZbJ1BBVEhFWFQnXSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBleHRlbnNpb24gb2YgcHJvY2Vzcy5lbnZbJ1BBVEhFWFQnXS5zcGxpdChwYXRoLmRlbGltaXRlcikpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbnMucHVzaChleHRlbnNpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBpdCdzIHJvb3RlZCwgcmV0dXJuIGl0IGlmIGV4aXN0cy4gb3RoZXJ3aXNlIHJldHVybiBlbXB0eS5cbiAgICAgICAgaWYgKGlvVXRpbC5pc1Jvb3RlZCh0b29sKSkge1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSB5aWVsZCBpb1V0aWwudHJ5R2V0RXhlY3V0YWJsZVBhdGgodG9vbCwgZXh0ZW5zaW9ucyk7XG4gICAgICAgICAgICBpZiAoZmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2ZpbGVQYXRoXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBhbnkgcGF0aCBzZXBhcmF0b3JzLCByZXR1cm4gZW1wdHlcbiAgICAgICAgaWYgKHRvb2wuaW5jbHVkZXMocGF0aC5zZXApKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgLy8gYnVpbGQgdGhlIGxpc3Qgb2YgZGlyZWN0b3JpZXNcbiAgICAgICAgLy9cbiAgICAgICAgLy8gTm90ZSwgdGVjaG5pY2FsbHkgXCJ3aGVyZVwiIGNoZWNrcyB0aGUgY3VycmVudCBkaXJlY3Rvcnkgb24gV2luZG93cy4gRnJvbSBhIHRvb2xraXQgcGVyc3BlY3RpdmUsXG4gICAgICAgIC8vIGl0IGZlZWxzIGxpa2Ugd2Ugc2hvdWxkIG5vdCBkbyB0aGlzLiBDaGVja2luZyB0aGUgY3VycmVudCBkaXJlY3Rvcnkgc2VlbXMgbGlrZSBtb3JlIG9mIGEgdXNlXG4gICAgICAgIC8vIGNhc2Ugb2YgYSBzaGVsbCwgYW5kIHRoZSB3aGljaCgpIGZ1bmN0aW9uIGV4cG9zZWQgYnkgdGhlIHRvb2xraXQgc2hvdWxkIHN0cml2ZSBmb3IgY29uc2lzdGVuY3lcbiAgICAgICAgLy8gYWNyb3NzIHBsYXRmb3Jtcy5cbiAgICAgICAgY29uc3QgZGlyZWN0b3JpZXMgPSBbXTtcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52LlBBVEgpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcCBvZiBwcm9jZXNzLmVudi5QQVRILnNwbGl0KHBhdGguZGVsaW1pdGVyKSkge1xuICAgICAgICAgICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yaWVzLnB1c2gocCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGZpbmQgYWxsIG1hdGNoZXNcbiAgICAgICAgY29uc3QgbWF0Y2hlcyA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRpcmVjdG9yeSBvZiBkaXJlY3Rvcmllcykge1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSB5aWVsZCBpb1V0aWwudHJ5R2V0RXhlY3V0YWJsZVBhdGgocGF0aC5qb2luKGRpcmVjdG9yeSwgdG9vbCksIGV4dGVuc2lvbnMpO1xuICAgICAgICAgICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKGZpbGVQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF0Y2hlcztcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmluZEluUGF0aCA9IGZpbmRJblBhdGg7XG5mdW5jdGlvbiByZWFkQ29weU9wdGlvbnMob3B0aW9ucykge1xuICAgIGNvbnN0IGZvcmNlID0gb3B0aW9ucy5mb3JjZSA9PSBudWxsID8gdHJ1ZSA6IG9wdGlvbnMuZm9yY2U7XG4gICAgY29uc3QgcmVjdXJzaXZlID0gQm9vbGVhbihvcHRpb25zLnJlY3Vyc2l2ZSk7XG4gICAgY29uc3QgY29weVNvdXJjZURpcmVjdG9yeSA9IG9wdGlvbnMuY29weVNvdXJjZURpcmVjdG9yeSA9PSBudWxsXG4gICAgICAgID8gdHJ1ZVxuICAgICAgICA6IEJvb2xlYW4ob3B0aW9ucy5jb3B5U291cmNlRGlyZWN0b3J5KTtcbiAgICByZXR1cm4geyBmb3JjZSwgcmVjdXJzaXZlLCBjb3B5U291cmNlRGlyZWN0b3J5IH07XG59XG5mdW5jdGlvbiBjcERpclJlY3Vyc2l2ZShzb3VyY2VEaXIsIGRlc3REaXIsIGN1cnJlbnREZXB0aCwgZm9yY2UpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAvLyBFbnN1cmUgdGhlcmUgaXMgbm90IGEgcnVuIGF3YXkgcmVjdXJzaXZlIGNvcHlcbiAgICAgICAgaWYgKGN1cnJlbnREZXB0aCA+PSAyNTUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGN1cnJlbnREZXB0aCsrO1xuICAgICAgICB5aWVsZCBta2RpclAoZGVzdERpcik7XG4gICAgICAgIGNvbnN0IGZpbGVzID0geWllbGQgaW9VdGlsLnJlYWRkaXIoc291cmNlRGlyKTtcbiAgICAgICAgZm9yIChjb25zdCBmaWxlTmFtZSBvZiBmaWxlcykge1xuICAgICAgICAgICAgY29uc3Qgc3JjRmlsZSA9IGAke3NvdXJjZURpcn0vJHtmaWxlTmFtZX1gO1xuICAgICAgICAgICAgY29uc3QgZGVzdEZpbGUgPSBgJHtkZXN0RGlyfS8ke2ZpbGVOYW1lfWA7XG4gICAgICAgICAgICBjb25zdCBzcmNGaWxlU3RhdCA9IHlpZWxkIGlvVXRpbC5sc3RhdChzcmNGaWxlKTtcbiAgICAgICAgICAgIGlmIChzcmNGaWxlU3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVjdXJzZVxuICAgICAgICAgICAgICAgIHlpZWxkIGNwRGlyUmVjdXJzaXZlKHNyY0ZpbGUsIGRlc3RGaWxlLCBjdXJyZW50RGVwdGgsIGZvcmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHlpZWxkIGNvcHlGaWxlKHNyY0ZpbGUsIGRlc3RGaWxlLCBmb3JjZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBtb2RlIGZvciB0aGUgbmV3bHkgY3JlYXRlZCBkaXJlY3RvcnlcbiAgICAgICAgeWllbGQgaW9VdGlsLmNobW9kKGRlc3REaXIsICh5aWVsZCBpb1V0aWwuc3RhdChzb3VyY2VEaXIpKS5tb2RlKTtcbiAgICB9KTtcbn1cbi8vIEJ1ZmZlcmVkIGZpbGUgY29weVxuZnVuY3Rpb24gY29weUZpbGUoc3JjRmlsZSwgZGVzdEZpbGUsIGZvcmNlKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgaWYgKCh5aWVsZCBpb1V0aWwubHN0YXQoc3JjRmlsZSkpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgIC8vIHVubGluay9yZS1saW5rIGl0XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHlpZWxkIGlvVXRpbC5sc3RhdChkZXN0RmlsZSk7XG4gICAgICAgICAgICAgICAgeWllbGQgaW9VdGlsLnVubGluayhkZXN0RmlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSB0byBvdmVycmlkZSBmaWxlIHBlcm1pc3Npb25cbiAgICAgICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnRVBFUk0nKSB7XG4gICAgICAgICAgICAgICAgICAgIHlpZWxkIGlvVXRpbC5jaG1vZChkZXN0RmlsZSwgJzA2NjYnKTtcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgaW9VdGlsLnVubGluayhkZXN0RmlsZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIG90aGVyIGVycm9ycyA9IGl0IGRvZXNuJ3QgZXhpc3QsIG5vIHdvcmsgdG8gZG9cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENvcHkgb3ZlciBzeW1saW5rXG4gICAgICAgICAgICBjb25zdCBzeW1saW5rRnVsbCA9IHlpZWxkIGlvVXRpbC5yZWFkbGluayhzcmNGaWxlKTtcbiAgICAgICAgICAgIHlpZWxkIGlvVXRpbC5zeW1saW5rKHN5bWxpbmtGdWxsLCBkZXN0RmlsZSwgaW9VdGlsLklTX1dJTkRPV1MgPyAnanVuY3Rpb24nIDogbnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoISh5aWVsZCBpb1V0aWwuZXhpc3RzKGRlc3RGaWxlKSkgfHwgZm9yY2UpIHtcbiAgICAgICAgICAgIHlpZWxkIGlvVXRpbC5jb3B5RmlsZShzcmNGaWxlLCBkZXN0RmlsZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlvLmpzLm1hcCIsCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfSk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xufSk7XG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmFyZ1N0cmluZ1RvQXJyYXkgPSBleHBvcnRzLlRvb2xSdW5uZXIgPSB2b2lkIDA7XG5jb25zdCBvcyA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwib3NcIikpO1xuY29uc3QgZXZlbnRzID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJldmVudHNcIikpO1xuY29uc3QgY2hpbGQgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIikpO1xuY29uc3QgcGF0aCA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwicGF0aFwiKSk7XG5jb25zdCBpbyA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwiQGFjdGlvbnMvaW9cIikpO1xuY29uc3QgaW9VdGlsID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJAYWN0aW9ucy9pby9saWIvaW8tdXRpbFwiKSk7XG5jb25zdCB0aW1lcnNfMSA9IHJlcXVpcmUoXCJ0aW1lcnNcIik7XG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2QgKi9cbmNvbnN0IElTX1dJTkRPV1MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuLypcbiAqIENsYXNzIGZvciBydW5uaW5nIGNvbW1hbmQgbGluZSB0b29scy4gSGFuZGxlcyBxdW90aW5nIGFuZCBhcmcgcGFyc2luZyBpbiBhIHBsYXRmb3JtIGFnbm9zdGljIHdheS5cbiAqL1xuY2xhc3MgVG9vbFJ1bm5lciBleHRlbmRzIGV2ZW50cy5FdmVudEVtaXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yKHRvb2xQYXRoLCBhcmdzLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGlmICghdG9vbFBhdGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBhcmFtZXRlciAndG9vbFBhdGgnIGNhbm5vdCBiZSBudWxsIG9yIGVtcHR5LlwiKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRvb2xQYXRoID0gdG9vbFBhdGg7XG4gICAgICAgIHRoaXMuYXJncyA9IGFyZ3MgfHwgW107XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgfVxuICAgIF9kZWJ1ZyhtZXNzYWdlKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMubGlzdGVuZXJzICYmIHRoaXMub3B0aW9ucy5saXN0ZW5lcnMuZGVidWcpIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5saXN0ZW5lcnMuZGVidWcobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2dldENvbW1hbmRTdHJpbmcob3B0aW9ucywgbm9QcmVmaXgpIHtcbiAgICAgICAgY29uc3QgdG9vbFBhdGggPSB0aGlzLl9nZXRTcGF3bkZpbGVOYW1lKCk7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSB0aGlzLl9nZXRTcGF3bkFyZ3Mob3B0aW9ucyk7XG4gICAgICAgIGxldCBjbWQgPSBub1ByZWZpeCA/ICcnIDogJ1tjb21tYW5kXSc7IC8vIG9taXQgcHJlZml4IHdoZW4gcGlwZWQgdG8gYSBzZWNvbmQgdG9vbFxuICAgICAgICBpZiAoSVNfV0lORE9XUykge1xuICAgICAgICAgICAgLy8gV2luZG93cyArIGNtZCBmaWxlXG4gICAgICAgICAgICBpZiAodGhpcy5faXNDbWRGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICBjbWQgKz0gdG9vbFBhdGg7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhIG9mIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY21kICs9IGAgJHthfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gV2luZG93cyArIHZlcmJhdGltXG4gICAgICAgICAgICBlbHNlIGlmIChvcHRpb25zLndpbmRvd3NWZXJiYXRpbUFyZ3VtZW50cykge1xuICAgICAgICAgICAgICAgIGNtZCArPSBgXCIke3Rvb2xQYXRofVwiYDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGEgb2YgYXJncykge1xuICAgICAgICAgICAgICAgICAgICBjbWQgKz0gYCAke2F9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBXaW5kb3dzIChyZWd1bGFyKVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY21kICs9IHRoaXMuX3dpbmRvd3NRdW90ZUNtZEFyZyh0b29sUGF0aCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhIG9mIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY21kICs9IGAgJHt0aGlzLl93aW5kb3dzUXVvdGVDbWRBcmcoYSl9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBPU1gvTGludXggLSB0aGlzIGNhbiBsaWtlbHkgYmUgaW1wcm92ZWQgd2l0aCBzb21lIGZvcm0gb2YgcXVvdGluZy5cbiAgICAgICAgICAgIC8vIGNyZWF0aW5nIHByb2Nlc3NlcyBvbiBVbml4IGlzIGZ1bmRhbWVudGFsbHkgZGlmZmVyZW50IHRoYW4gV2luZG93cy5cbiAgICAgICAgICAgIC8vIG9uIFVuaXgsIGV4ZWN2cCgpIHRha2VzIGFuIGFyZyBhcnJheS5cbiAgICAgICAgICAgIGNtZCArPSB0b29sUGF0aDtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYSBvZiBhcmdzKSB7XG4gICAgICAgICAgICAgICAgY21kICs9IGAgJHthfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNtZDtcbiAgICB9XG4gICAgX3Byb2Nlc3NMaW5lQnVmZmVyKGRhdGEsIHN0ckJ1ZmZlciwgb25MaW5lKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgcyA9IHN0ckJ1ZmZlciArIGRhdGEudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGxldCBuID0gcy5pbmRleE9mKG9zLkVPTCk7XG4gICAgICAgICAgICB3aGlsZSAobiA+IC0xKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGluZSA9IHMuc3Vic3RyaW5nKDAsIG4pO1xuICAgICAgICAgICAgICAgIG9uTGluZShsaW5lKTtcbiAgICAgICAgICAgICAgICAvLyB0aGUgcmVzdCBvZiB0aGUgc3RyaW5nIC4uLlxuICAgICAgICAgICAgICAgIHMgPSBzLnN1YnN0cmluZyhuICsgb3MuRU9MLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgbiA9IHMuaW5kZXhPZihvcy5FT0wpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgLy8gc3RyZWFtaW5nIGxpbmVzIHRvIGNvbnNvbGUgaXMgYmVzdCBlZmZvcnQuICBEb24ndCBmYWlsIGEgYnVpbGQuXG4gICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgZXJyb3IgcHJvY2Vzc2luZyBsaW5lLiBGYWlsZWQgd2l0aCBlcnJvciAke2Vycn1gKTtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBfZ2V0U3Bhd25GaWxlTmFtZSgpIHtcbiAgICAgICAgaWYgKElTX1dJTkRPV1MpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc0NtZEZpbGUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9jZXNzLmVudlsnQ09NU1BFQyddIHx8ICdjbWQuZXhlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy50b29sUGF0aDtcbiAgICB9XG4gICAgX2dldFNwYXduQXJncyhvcHRpb25zKSB7XG4gICAgICAgIGlmIChJU19XSU5ET1dTKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNDbWRGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICBsZXQgYXJnbGluZSA9IGAvRCAvUyAvQyBcIiR7dGhpcy5fd2luZG93c1F1b3RlQ21kQXJnKHRoaXMudG9vbFBhdGgpfWA7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhIG9mIHRoaXMuYXJncykge1xuICAgICAgICAgICAgICAgICAgICBhcmdsaW5lICs9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgYXJnbGluZSArPSBvcHRpb25zLndpbmRvd3NWZXJiYXRpbUFyZ3VtZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBhXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuX3dpbmRvd3NRdW90ZUNtZEFyZyhhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXJnbGluZSArPSAnXCInO1xuICAgICAgICAgICAgICAgIHJldHVybiBbYXJnbGluZV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYXJncztcbiAgICB9XG4gICAgX2VuZHNXaXRoKHN0ciwgZW5kKSB7XG4gICAgICAgIHJldHVybiBzdHIuZW5kc1dpdGgoZW5kKTtcbiAgICB9XG4gICAgX2lzQ21kRmlsZSgpIHtcbiAgICAgICAgY29uc3QgdXBwZXJUb29sUGF0aCA9IHRoaXMudG9vbFBhdGgudG9VcHBlckNhc2UoKTtcbiAgICAgICAgcmV0dXJuICh0aGlzLl9lbmRzV2l0aCh1cHBlclRvb2xQYXRoLCAnLkNNRCcpIHx8XG4gICAgICAgICAgICB0aGlzLl9lbmRzV2l0aCh1cHBlclRvb2xQYXRoLCAnLkJBVCcpKTtcbiAgICB9XG4gICAgX3dpbmRvd3NRdW90ZUNtZEFyZyhhcmcpIHtcbiAgICAgICAgLy8gZm9yIC5leGUsIGFwcGx5IHRoZSBub3JtYWwgcXVvdGluZyBydWxlcyB0aGF0IGxpYnV2IGFwcGxpZXNcbiAgICAgICAgaWYgKCF0aGlzLl9pc0NtZEZpbGUoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3V2UXVvdGVDbWRBcmcoYXJnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBvdGhlcndpc2UgYXBwbHkgcXVvdGluZyBydWxlcyBzcGVjaWZpYyB0byB0aGUgY21kLmV4ZSBjb21tYW5kIGxpbmUgcGFyc2VyLlxuICAgICAgICAvLyB0aGUgbGlidXYgcnVsZXMgYXJlIGdlbmVyaWMgYW5kIGFyZSBub3QgZGVzaWduZWQgc3BlY2lmaWNhbGx5IGZvciBjbWQuZXhlXG4gICAgICAgIC8vIGNvbW1hbmQgbGluZSBwYXJzZXIuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGZvciBhIGRldGFpbGVkIGRlc2NyaXB0aW9uIG9mIHRoZSBjbWQuZXhlIGNvbW1hbmQgbGluZSBwYXJzZXIsIHJlZmVyIHRvXG4gICAgICAgIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDA5NDY5OS9ob3ctZG9lcy10aGUtd2luZG93cy1jb21tYW5kLWludGVycHJldGVyLWNtZC1leGUtcGFyc2Utc2NyaXB0cy83OTcwOTEyIzc5NzA5MTJcbiAgICAgICAgLy8gbmVlZCBxdW90ZXMgZm9yIGVtcHR5IGFyZ1xuICAgICAgICBpZiAoIWFyZykge1xuICAgICAgICAgICAgcmV0dXJuICdcIlwiJztcbiAgICAgICAgfVxuICAgICAgICAvLyBkZXRlcm1pbmUgd2hldGhlciB0aGUgYXJnIG5lZWRzIHRvIGJlIHF1b3RlZFxuICAgICAgICBjb25zdCBjbWRTcGVjaWFsQ2hhcnMgPSBbXG4gICAgICAgICAgICAnICcsXG4gICAgICAgICAgICAnXFx0JyxcbiAgICAgICAgICAgICcmJyxcbiAgICAgICAgICAgICcoJyxcbiAgICAgICAgICAgICcpJyxcbiAgICAgICAgICAgICdbJyxcbiAgICAgICAgICAgICddJyxcbiAgICAgICAgICAgICd7JyxcbiAgICAgICAgICAgICd9JyxcbiAgICAgICAgICAgICdeJyxcbiAgICAgICAgICAgICc9JyxcbiAgICAgICAgICAgICc7JyxcbiAgICAgICAgICAgICchJyxcbiAgICAgICAgICAgIFwiJ1wiLFxuICAgICAgICAgICAgJysnLFxuICAgICAgICAgICAgJywnLFxuICAgICAgICAgICAgJ2AnLFxuICAgICAgICAgICAgJ34nLFxuICAgICAgICAgICAgJ3wnLFxuICAgICAgICAgICAgJzwnLFxuICAgICAgICAgICAgJz4nLFxuICAgICAgICAgICAgJ1wiJ1xuICAgICAgICBdO1xuICAgICAgICBsZXQgbmVlZHNRdW90ZXMgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjb25zdCBjaGFyIG9mIGFyZykge1xuICAgICAgICAgICAgaWYgKGNtZFNwZWNpYWxDaGFycy5zb21lKHggPT4geCA9PT0gY2hhcikpIHtcbiAgICAgICAgICAgICAgICBuZWVkc1F1b3RlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2hvcnQtY2lyY3VpdCBpZiBxdW90ZXMgbm90IG5lZWRlZFxuICAgICAgICBpZiAoIW5lZWRzUXVvdGVzKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRoZSBmb2xsb3dpbmcgcXVvdGluZyBydWxlcyBhcmUgdmVyeSBzaW1pbGFyIHRvIHRoZSBydWxlcyB0aGF0IGJ5IGxpYnV2IGFwcGxpZXMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIDEpIHdyYXAgdGhlIHN0cmluZyBpbiBxdW90ZXNcbiAgICAgICAgLy9cbiAgICAgICAgLy8gMikgZG91YmxlLXVwIHF1b3RlcyAtIGkuZS4gXCIgPT4gXCJcIlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICB0aGlzIGlzIGRpZmZlcmVudCBmcm9tIHRoZSBsaWJ1diBxdW90aW5nIHJ1bGVzLiBsaWJ1diByZXBsYWNlcyBcIiB3aXRoIFxcXCIsIHdoaWNoIHVuZm9ydHVuYXRlbHlcbiAgICAgICAgLy8gICAgZG9lc24ndCB3b3JrIHdlbGwgd2l0aCBhIGNtZC5leGUgY29tbWFuZCBsaW5lLlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICBub3RlLCByZXBsYWNpbmcgXCIgd2l0aCBcIlwiIGFsc28gd29ya3Mgd2VsbCBpZiB0aGUgYXJnIGlzIHBhc3NlZCB0byBhIGRvd25zdHJlYW0gLk5FVCBjb25zb2xlIGFwcC5cbiAgICAgICAgLy8gICAgZm9yIGV4YW1wbGUsIHRoZSBjb21tYW5kIGxpbmU6XG4gICAgICAgIC8vICAgICAgICAgIGZvby5leGUgXCJteWFyZzpcIlwibXkgdmFsXCJcIlwiXG4gICAgICAgIC8vICAgIGlzIHBhcnNlZCBieSBhIC5ORVQgY29uc29sZSBhcHAgaW50byBhbiBhcmcgYXJyYXk6XG4gICAgICAgIC8vICAgICAgICAgIFsgXCJteWFyZzpcXFwibXkgdmFsXFxcIlwiIF1cbiAgICAgICAgLy8gICAgd2hpY2ggaXMgdGhlIHNhbWUgZW5kIHJlc3VsdCB3aGVuIGFwcGx5aW5nIGxpYnV2IHF1b3RpbmcgcnVsZXMuIGFsdGhvdWdoIHRoZSBhY3R1YWxcbiAgICAgICAgLy8gICAgY29tbWFuZCBsaW5lIGZyb20gbGlidXYgcXVvdGluZyBydWxlcyB3b3VsZCBsb29rIGxpa2U6XG4gICAgICAgIC8vICAgICAgICAgIGZvby5leGUgXCJteWFyZzpcXFwibXkgdmFsXFxcIlwiXG4gICAgICAgIC8vXG4gICAgICAgIC8vIDMpIGRvdWJsZS11cCBzbGFzaGVzIHRoYXQgcHJlY2VkZSBhIHF1b3RlLFxuICAgICAgICAvLyAgICBlLmcuICBoZWxsbyBcXHdvcmxkICAgID0+IFwiaGVsbG8gXFx3b3JsZFwiXG4gICAgICAgIC8vICAgICAgICAgIGhlbGxvXFxcIndvcmxkICAgID0+IFwiaGVsbG9cXFxcXCJcIndvcmxkXCJcbiAgICAgICAgLy8gICAgICAgICAgaGVsbG9cXFxcXCJ3b3JsZCAgID0+IFwiaGVsbG9cXFxcXFxcXFwiXCJ3b3JsZFwiXG4gICAgICAgIC8vICAgICAgICAgIGhlbGxvIHdvcmxkXFwgICAgPT4gXCJoZWxsbyB3b3JsZFxcXFxcIlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICB0ZWNobmljYWxseSB0aGlzIGlzIG5vdCByZXF1aXJlZCBmb3IgYSBjbWQuZXhlIGNvbW1hbmQgbGluZSwgb3IgdGhlIGJhdGNoIGFyZ3VtZW50IHBhcnNlci5cbiAgICAgICAgLy8gICAgdGhlIHJlYXNvbnMgZm9yIGluY2x1ZGluZyB0aGlzIGFzIGEgLmNtZCBxdW90aW5nIHJ1bGUgYXJlOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICBhKSB0aGlzIGlzIG9wdGltaXplZCBmb3IgdGhlIHNjZW5hcmlvIHdoZXJlIHRoZSBhcmd1bWVudCBpcyBwYXNzZWQgZnJvbSB0aGUgLmNtZCBmaWxlIHRvIGFuXG4gICAgICAgIC8vICAgICAgIGV4dGVybmFsIHByb2dyYW0uIG1hbnkgcHJvZ3JhbXMgKGUuZy4gLk5FVCBjb25zb2xlIGFwcHMpIHJlbHkgb24gdGhlIHNsYXNoLWRvdWJsaW5nIHJ1bGUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgIGIpIGl0J3Mgd2hhdCB3ZSd2ZSBiZWVuIGRvaW5nIHByZXZpb3VzbHkgKGJ5IGRlZmVycmluZyB0byBub2RlIGRlZmF1bHQgYmVoYXZpb3IpIGFuZCB3ZVxuICAgICAgICAvLyAgICAgICBoYXZlbid0IGhlYXJkIGFueSBjb21wbGFpbnRzIGFib3V0IHRoYXQgYXNwZWN0LlxuICAgICAgICAvL1xuICAgICAgICAvLyBub3RlLCBhIHdlYWtuZXNzIG9mIHRoZSBxdW90aW5nIHJ1bGVzIGNob3NlbiBoZXJlLCBpcyB0aGF0ICUgaXMgbm90IGVzY2FwZWQuIGluIGZhY3QsICUgY2Fubm90IGJlXG4gICAgICAgIC8vIGVzY2FwZWQgd2hlbiB1c2VkIG9uIHRoZSBjb21tYW5kIGxpbmUgZGlyZWN0bHkgLSBldmVuIHRob3VnaCB3aXRoaW4gYSAuY21kIGZpbGUgJSBjYW4gYmUgZXNjYXBlZFxuICAgICAgICAvLyBieSB1c2luZyAlJS5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gdGhlIHNhdmluZyBncmFjZSBpcywgb24gdGhlIGNvbW1hbmQgbGluZSwgJXZhciUgaXMgbGVmdCBhcy1pcyBpZiB2YXIgaXMgbm90IGRlZmluZWQuIHRoaXMgY29udHJhc3RzXG4gICAgICAgIC8vIHRoZSBsaW5lIHBhcnNpbmcgcnVsZXMgd2l0aGluIGEgLmNtZCBmaWxlLCB3aGVyZSBpZiB2YXIgaXMgbm90IGRlZmluZWQgaXQgaXMgcmVwbGFjZWQgd2l0aCBub3RoaW5nLlxuICAgICAgICAvL1xuICAgICAgICAvLyBvbmUgb3B0aW9uIHRoYXQgd2FzIGV4cGxvcmVkIHdhcyByZXBsYWNpbmcgJSB3aXRoIF4lIC0gaS5lLiAldmFyJSA9PiBeJXZhcl4lLiB0aGlzIGhhY2sgd291bGRcbiAgICAgICAgLy8gb2Z0ZW4gd29yaywgc2luY2UgaXQgaXMgdW5saWtlbHkgdGhhdCB2YXJeIHdvdWxkIGV4aXN0LCBhbmQgdGhlIF4gY2hhcmFjdGVyIGlzIHJlbW92ZWQgd2hlbiB0aGVcbiAgICAgICAgLy8gdmFyaWFibGUgaXMgdXNlZC4gdGhlIHByb2JsZW0sIGhvd2V2ZXIsIGlzIHRoYXQgXiBpcyBub3QgcmVtb3ZlZCB3aGVuICUqIGlzIHVzZWQgdG8gcGFzcyB0aGUgYXJnc1xuICAgICAgICAvLyB0byBhbiBleHRlcm5hbCBwcm9ncmFtLlxuICAgICAgICAvL1xuICAgICAgICAvLyBhbiB1bmV4cGxvcmVkIHBvdGVudGlhbCBzb2x1dGlvbiBmb3IgdGhlICUgZXNjYXBpbmcgcHJvYmxlbSwgaXMgdG8gY3JlYXRlIGEgd3JhcHBlciAuY21kIGZpbGUuXG4gICAgICAgIC8vICUgY2FuIGJlIGVzY2FwZWQgd2l0aGluIGEgLmNtZCBmaWxlLlxuICAgICAgICBsZXQgcmV2ZXJzZSA9ICdcIic7XG4gICAgICAgIGxldCBxdW90ZUhpdCA9IHRydWU7XG4gICAgICAgIGZvciAobGV0IGkgPSBhcmcubGVuZ3RoOyBpID4gMDsgaS0tKSB7XG4gICAgICAgICAgICAvLyB3YWxrIHRoZSBzdHJpbmcgaW4gcmV2ZXJzZVxuICAgICAgICAgICAgcmV2ZXJzZSArPSBhcmdbaSAtIDFdO1xuICAgICAgICAgICAgaWYgKHF1b3RlSGl0ICYmIGFyZ1tpIC0gMV0gPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgIHJldmVyc2UgKz0gJ1xcXFwnOyAvLyBkb3VibGUgdGhlIHNsYXNoXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChhcmdbaSAtIDFdID09PSAnXCInKSB7XG4gICAgICAgICAgICAgICAgcXVvdGVIaXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldmVyc2UgKz0gJ1wiJzsgLy8gZG91YmxlIHRoZSBxdW90ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcXVvdGVIaXQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXZlcnNlICs9ICdcIic7XG4gICAgICAgIHJldHVybiByZXZlcnNlXG4gICAgICAgICAgICAuc3BsaXQoJycpXG4gICAgICAgICAgICAucmV2ZXJzZSgpXG4gICAgICAgICAgICAuam9pbignJyk7XG4gICAgfVxuICAgIF91dlF1b3RlQ21kQXJnKGFyZykge1xuICAgICAgICAvLyBUb29sIHJ1bm5lciB3cmFwcyBjaGlsZF9wcm9jZXNzLnNwYXduKCkgYW5kIG5lZWRzIHRvIGFwcGx5IHRoZSBzYW1lIHF1b3RpbmcgYXNcbiAgICAgICAgLy8gTm9kZSBpbiBjZXJ0YWluIGNhc2VzIHdoZXJlIHRoZSB1bmRvY3VtZW50ZWQgc3Bhd24gb3B0aW9uIHdpbmRvd3NWZXJiYXRpbUFyZ3VtZW50c1xuICAgICAgICAvLyBpcyB1c2VkLlxuICAgICAgICAvL1xuICAgICAgICAvLyBTaW5jZSB0aGlzIGZ1bmN0aW9uIGlzIGEgcG9ydCBvZiBxdW90ZV9jbWRfYXJnIGZyb20gTm9kZSA0LnggKHRlY2huaWNhbGx5LCBsaWIgVVYsXG4gICAgICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvYmxvYi92NC54L2RlcHMvdXYvc3JjL3dpbi9wcm9jZXNzLmMgZm9yIGRldGFpbHMpLFxuICAgICAgICAvLyBwYXN0aW5nIGNvcHlyaWdodCBub3RpY2UgZnJvbSBOb2RlIHdpdGhpbiB0aGlzIGZ1bmN0aW9uOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAgICAgICAgLy8gICAgICBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0b1xuICAgICAgICAvLyAgICAgIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlXG4gICAgICAgIC8vICAgICAgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yXG4gICAgICAgIC8vICAgICAgc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAgICAgICAgLy8gICAgICBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gICAgICAgIC8vICAgICAgYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICAgICAgICAvLyAgICAgIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICAgICAgICAvLyAgICAgIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICAgICAgICAvLyAgICAgIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAgICAgICAgLy8gICAgICBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lOR1xuICAgICAgICAvLyAgICAgIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1NcbiAgICAgICAgLy8gICAgICBJTiBUSEUgU09GVFdBUkUuXG4gICAgICAgIGlmICghYXJnKSB7XG4gICAgICAgICAgICAvLyBOZWVkIGRvdWJsZSBxdW90YXRpb24gZm9yIGVtcHR5IGFyZ3VtZW50XG4gICAgICAgICAgICByZXR1cm4gJ1wiXCInO1xuICAgICAgICB9XG4gICAgICAgIGlmICghYXJnLmluY2x1ZGVzKCcgJykgJiYgIWFyZy5pbmNsdWRlcygnXFx0JykgJiYgIWFyZy5pbmNsdWRlcygnXCInKSkge1xuICAgICAgICAgICAgLy8gTm8gcXVvdGF0aW9uIG5lZWRlZFxuICAgICAgICAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWFyZy5pbmNsdWRlcygnXCInKSAmJiAhYXJnLmluY2x1ZGVzKCdcXFxcJykpIHtcbiAgICAgICAgICAgIC8vIE5vIGVtYmVkZGVkIGRvdWJsZSBxdW90ZXMgb3IgYmFja3NsYXNoZXMsIHNvIEkgY2FuIGp1c3Qgd3JhcFxuICAgICAgICAgICAgLy8gcXVvdGUgbWFya3MgYXJvdW5kIHRoZSB3aG9sZSB0aGluZy5cbiAgICAgICAgICAgIHJldHVybiBgXCIke2FyZ31cImA7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRXhwZWN0ZWQgaW5wdXQvb3V0cHV0OlxuICAgICAgICAvLyAgIGlucHV0IDogaGVsbG9cIndvcmxkXG4gICAgICAgIC8vICAgb3V0cHV0OiBcImhlbGxvXFxcIndvcmxkXCJcbiAgICAgICAgLy8gICBpbnB1dCA6IGhlbGxvXCJcIndvcmxkXG4gICAgICAgIC8vICAgb3V0cHV0OiBcImhlbGxvXFxcIlxcXCJ3b3JsZFwiXG4gICAgICAgIC8vICAgaW5wdXQgOiBoZWxsb1xcd29ybGRcbiAgICAgICAgLy8gICBvdXRwdXQ6IGhlbGxvXFx3b3JsZFxuICAgICAgICAvLyAgIGlucHV0IDogaGVsbG9cXFxcd29ybGRcbiAgICAgICAgLy8gICBvdXRwdXQ6IGhlbGxvXFxcXHdvcmxkXG4gICAgICAgIC8vICAgaW5wdXQgOiBoZWxsb1xcXCJ3b3JsZFxuICAgICAgICAvLyAgIG91dHB1dDogXCJoZWxsb1xcXFxcXFwid29ybGRcIlxuICAgICAgICAvLyAgIGlucHV0IDogaGVsbG9cXFxcXCJ3b3JsZFxuICAgICAgICAvLyAgIG91dHB1dDogXCJoZWxsb1xcXFxcXFxcXFxcIndvcmxkXCJcbiAgICAgICAgLy8gICBpbnB1dCA6IGhlbGxvIHdvcmxkXFxcbiAgICAgICAgLy8gICBvdXRwdXQ6IFwiaGVsbG8gd29ybGRcXFxcXCIgLSBub3RlIHRoZSBjb21tZW50IGluIGxpYnV2IGFjdHVhbGx5IHJlYWRzIFwiaGVsbG8gd29ybGRcXFwiXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidXQgaXQgYXBwZWFycyB0aGUgY29tbWVudCBpcyB3cm9uZywgaXQgc2hvdWxkIGJlIFwiaGVsbG8gd29ybGRcXFxcXCJcbiAgICAgICAgbGV0IHJldmVyc2UgPSAnXCInO1xuICAgICAgICBsZXQgcXVvdGVIaXQgPSB0cnVlO1xuICAgICAgICBmb3IgKGxldCBpID0gYXJnLmxlbmd0aDsgaSA+IDA7IGktLSkge1xuICAgICAgICAgICAgLy8gd2FsayB0aGUgc3RyaW5nIGluIHJldmVyc2VcbiAgICAgICAgICAgIHJldmVyc2UgKz0gYXJnW2kgLSAxXTtcbiAgICAgICAgICAgIGlmIChxdW90ZUhpdCAmJiBhcmdbaSAtIDFdID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICByZXZlcnNlICs9ICdcXFxcJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGFyZ1tpIC0gMV0gPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgICBxdW90ZUhpdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV2ZXJzZSArPSAnXFxcXCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBxdW90ZUhpdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldmVyc2UgKz0gJ1wiJztcbiAgICAgICAgcmV0dXJuIHJldmVyc2VcbiAgICAgICAgICAgIC5zcGxpdCgnJylcbiAgICAgICAgICAgIC5yZXZlcnNlKClcbiAgICAgICAgICAgIC5qb2luKCcnKTtcbiAgICB9XG4gICAgX2Nsb25lRXhlY09wdGlvbnMob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICAgICAgY3dkOiBvcHRpb25zLmN3ZCB8fCBwcm9jZXNzLmN3ZCgpLFxuICAgICAgICAgICAgZW52OiBvcHRpb25zLmVudiB8fCBwcm9jZXNzLmVudixcbiAgICAgICAgICAgIHNpbGVudDogb3B0aW9ucy5zaWxlbnQgfHwgZmFsc2UsXG4gICAgICAgICAgICB3aW5kb3dzVmVyYmF0aW1Bcmd1bWVudHM6IG9wdGlvbnMud2luZG93c1ZlcmJhdGltQXJndW1lbnRzIHx8IGZhbHNlLFxuICAgICAgICAgICAgZmFpbE9uU3RkRXJyOiBvcHRpb25zLmZhaWxPblN0ZEVyciB8fCBmYWxzZSxcbiAgICAgICAgICAgIGlnbm9yZVJldHVybkNvZGU6IG9wdGlvbnMuaWdub3JlUmV0dXJuQ29kZSB8fCBmYWxzZSxcbiAgICAgICAgICAgIGRlbGF5OiBvcHRpb25zLmRlbGF5IHx8IDEwMDAwXG4gICAgICAgIH07XG4gICAgICAgIHJlc3VsdC5vdXRTdHJlYW0gPSBvcHRpb25zLm91dFN0cmVhbSB8fCBwcm9jZXNzLnN0ZG91dDtcbiAgICAgICAgcmVzdWx0LmVyclN0cmVhbSA9IG9wdGlvbnMuZXJyU3RyZWFtIHx8IHByb2Nlc3Muc3RkZXJyO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBfZ2V0U3Bhd25PcHRpb25zKG9wdGlvbnMsIHRvb2xQYXRoKSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICAgICAgcmVzdWx0LmN3ZCA9IG9wdGlvbnMuY3dkO1xuICAgICAgICByZXN1bHQuZW52ID0gb3B0aW9ucy5lbnY7XG4gICAgICAgIHJlc3VsdFsnd2luZG93c1ZlcmJhdGltQXJndW1lbnRzJ10gPVxuICAgICAgICAgICAgb3B0aW9ucy53aW5kb3dzVmVyYmF0aW1Bcmd1bWVudHMgfHwgdGhpcy5faXNDbWRGaWxlKCk7XG4gICAgICAgIGlmIChvcHRpb25zLndpbmRvd3NWZXJiYXRpbUFyZ3VtZW50cykge1xuICAgICAgICAgICAgcmVzdWx0LmFyZ3YwID0gYFwiJHt0b29sUGF0aH1cImA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRXhlYyBhIHRvb2wuXG4gICAgICogT3V0cHV0IHdpbGwgYmUgc3RyZWFtZWQgdG8gdGhlIGxpdmUgY29uc29sZS5cbiAgICAgKiBSZXR1cm5zIHByb21pc2Ugd2l0aCByZXR1cm4gY29kZVxuICAgICAqXG4gICAgICogQHBhcmFtICAgICB0b29sICAgICBwYXRoIHRvIHRvb2wgdG8gZXhlY1xuICAgICAqIEBwYXJhbSAgICAgb3B0aW9ucyAgb3B0aW9uYWwgZXhlYyBvcHRpb25zLiAgU2VlIEV4ZWNPcHRpb25zXG4gICAgICogQHJldHVybnMgICBudW1iZXJcbiAgICAgKi9cbiAgICBleGVjKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgLy8gcm9vdCB0aGUgdG9vbCBwYXRoIGlmIGl0IGlzIHVucm9vdGVkIGFuZCBjb250YWlucyByZWxhdGl2ZSBwYXRoaW5nXG4gICAgICAgICAgICBpZiAoIWlvVXRpbC5pc1Jvb3RlZCh0aGlzLnRvb2xQYXRoKSAmJlxuICAgICAgICAgICAgICAgICh0aGlzLnRvb2xQYXRoLmluY2x1ZGVzKCcvJykgfHxcbiAgICAgICAgICAgICAgICAgICAgKElTX1dJTkRPV1MgJiYgdGhpcy50b29sUGF0aC5pbmNsdWRlcygnXFxcXCcpKSkpIHtcbiAgICAgICAgICAgICAgICAvLyBwcmVmZXIgb3B0aW9ucy5jd2QgaWYgaXQgaXMgc3BlY2lmaWVkLCBob3dldmVyIG9wdGlvbnMuY3dkIG1heSBhbHNvIG5lZWQgdG8gYmUgcm9vdGVkXG4gICAgICAgICAgICAgICAgdGhpcy50b29sUGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCB0aGlzLm9wdGlvbnMuY3dkIHx8IHByb2Nlc3MuY3dkKCksIHRoaXMudG9vbFBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWYgdGhlIHRvb2wgaXMgb25seSBhIGZpbGUgbmFtZSwgdGhlbiByZXNvbHZlIGl0IGZyb20gdGhlIFBBVEhcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSB2ZXJpZnkgaXQgZXhpc3RzIChhZGQgZXh0ZW5zaW9uIG9uIFdpbmRvd3MgaWYgbmVjZXNzYXJ5KVxuICAgICAgICAgICAgdGhpcy50b29sUGF0aCA9IHlpZWxkIGlvLndoaWNoKHRoaXMudG9vbFBhdGgsIHRydWUpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgZXhlYyB0b29sOiAke3RoaXMudG9vbFBhdGh9YCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGVidWcoJ2FyZ3VtZW50czonKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFyZyBvZiB0aGlzLmFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGVidWcoYCAgICR7YXJnfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zTm9uTnVsbCA9IHRoaXMuX2Nsb25lRXhlY09wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnNOb25OdWxsLnNpbGVudCAmJiBvcHRpb25zTm9uTnVsbC5vdXRTdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uc05vbk51bGwub3V0U3RyZWFtLndyaXRlKHRoaXMuX2dldENvbW1hbmRTdHJpbmcob3B0aW9uc05vbk51bGwpICsgb3MuRU9MKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSBuZXcgRXhlY1N0YXRlKG9wdGlvbnNOb25OdWxsLCB0aGlzLnRvb2xQYXRoKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5vbignZGVidWcnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9kZWJ1ZyhtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmN3ZCAmJiAhKHlpZWxkIGlvVXRpbC5leGlzdHModGhpcy5vcHRpb25zLmN3ZCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGBUaGUgY3dkOiAke3RoaXMub3B0aW9ucy5jd2R9IGRvZXMgbm90IGV4aXN0IWApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSB0aGlzLl9nZXRTcGF3bkZpbGVOYW1lKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgY3AgPSBjaGlsZC5zcGF3bihmaWxlTmFtZSwgdGhpcy5fZ2V0U3Bhd25BcmdzKG9wdGlvbnNOb25OdWxsKSwgdGhpcy5fZ2V0U3Bhd25PcHRpb25zKHRoaXMub3B0aW9ucywgZmlsZU5hbWUpKTtcbiAgICAgICAgICAgICAgICBsZXQgc3RkYnVmZmVyID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNwLnN0ZG91dCkge1xuICAgICAgICAgICAgICAgICAgICBjcC5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5saXN0ZW5lcnMgJiYgdGhpcy5vcHRpb25zLmxpc3RlbmVycy5zdGRvdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubGlzdGVuZXJzLnN0ZG91dChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0aW9uc05vbk51bGwuc2lsZW50ICYmIG9wdGlvbnNOb25OdWxsLm91dFN0cmVhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnNOb25OdWxsLm91dFN0cmVhbS53cml0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ZGJ1ZmZlciA9IHRoaXMuX3Byb2Nlc3NMaW5lQnVmZmVyKGRhdGEsIHN0ZGJ1ZmZlciwgKGxpbmUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmxpc3RlbmVycyAmJiB0aGlzLm9wdGlvbnMubGlzdGVuZXJzLnN0ZGxpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmxpc3RlbmVycy5zdGRsaW5lKGxpbmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGVycmJ1ZmZlciA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChjcC5zdGRlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY3Auc3RkZXJyLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLnByb2Nlc3NTdGRlcnIgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5saXN0ZW5lcnMgJiYgdGhpcy5vcHRpb25zLmxpc3RlbmVycy5zdGRlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubGlzdGVuZXJzLnN0ZGVycihkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0aW9uc05vbk51bGwuc2lsZW50ICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uc05vbk51bGwuZXJyU3RyZWFtICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uc05vbk51bGwub3V0U3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IG9wdGlvbnNOb25OdWxsLmZhaWxPblN0ZEVyclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IG9wdGlvbnNOb25OdWxsLmVyclN0cmVhbVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IG9wdGlvbnNOb25OdWxsLm91dFN0cmVhbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzLndyaXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyYnVmZmVyID0gdGhpcy5fcHJvY2Vzc0xpbmVCdWZmZXIoZGF0YSwgZXJyYnVmZmVyLCAobGluZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMubGlzdGVuZXJzICYmIHRoaXMub3B0aW9ucy5saXN0ZW5lcnMuZXJybGluZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubGlzdGVuZXJzLmVycmxpbmUobGluZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjcC5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnByb2Nlc3NFcnJvciA9IGVyci5tZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5wcm9jZXNzRXhpdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucHJvY2Vzc0Nsb3NlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLkNoZWNrQ29tcGxldGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBjcC5vbignZXhpdCcsIChjb2RlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnByb2Nlc3NFeGl0Q29kZSA9IGNvZGU7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnByb2Nlc3NFeGl0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgRXhpdCBjb2RlICR7Y29kZX0gcmVjZWl2ZWQgZnJvbSB0b29sICcke3RoaXMudG9vbFBhdGh9J2ApO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5DaGVja0NvbXBsZXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY3Aub24oJ2Nsb3NlJywgKGNvZGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucHJvY2Vzc0V4aXRDb2RlID0gY29kZTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucHJvY2Vzc0V4aXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnByb2Nlc3NDbG9zZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgU1RESU8gc3RyZWFtcyBoYXZlIGNsb3NlZCBmb3IgdG9vbCAnJHt0aGlzLnRvb2xQYXRofSdgKTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuQ2hlY2tDb21wbGV0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHN0YXRlLm9uKCdkb25lJywgKGVycm9yLCBleGl0Q29kZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RkYnVmZmVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnc3RkbGluZScsIHN0ZGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycmJ1ZmZlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2VycmxpbmUnLCBlcnJidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNwLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGV4aXRDb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjcC5zdGRpbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGlsZCBwcm9jZXNzIG1pc3Npbmcgc3RkaW4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjcC5zdGRpbi5lbmQodGhpcy5vcHRpb25zLmlucHV0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuVG9vbFJ1bm5lciA9IFRvb2xSdW5uZXI7XG4vKipcbiAqIENvbnZlcnQgYW4gYXJnIHN0cmluZyB0byBhbiBhcnJheSBvZiBhcmdzLiBIYW5kbGVzIGVzY2FwaW5nXG4gKlxuICogQHBhcmFtICAgIGFyZ1N0cmluZyAgIHN0cmluZyBvZiBhcmd1bWVudHNcbiAqIEByZXR1cm5zICBzdHJpbmdbXSAgICBhcnJheSBvZiBhcmd1bWVudHNcbiAqL1xuZnVuY3Rpb24gYXJnU3RyaW5nVG9BcnJheShhcmdTdHJpbmcpIHtcbiAgICBjb25zdCBhcmdzID0gW107XG4gICAgbGV0IGluUXVvdGVzID0gZmFsc2U7XG4gICAgbGV0IGVzY2FwZWQgPSBmYWxzZTtcbiAgICBsZXQgYXJnID0gJyc7XG4gICAgZnVuY3Rpb24gYXBwZW5kKGMpIHtcbiAgICAgICAgLy8gd2Ugb25seSBlc2NhcGUgZG91YmxlIHF1b3Rlcy5cbiAgICAgICAgaWYgKGVzY2FwZWQgJiYgYyAhPT0gJ1wiJykge1xuICAgICAgICAgICAgYXJnICs9ICdcXFxcJztcbiAgICAgICAgfVxuICAgICAgICBhcmcgKz0gYztcbiAgICAgICAgZXNjYXBlZCA9IGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ1N0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBjID0gYXJnU3RyaW5nLmNoYXJBdChpKTtcbiAgICAgICAgaWYgKGMgPT09ICdcIicpIHtcbiAgICAgICAgICAgIGlmICghZXNjYXBlZCkge1xuICAgICAgICAgICAgICAgIGluUXVvdGVzID0gIWluUXVvdGVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYXBwZW5kKGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGMgPT09ICdcXFxcJyAmJiBlc2NhcGVkKSB7XG4gICAgICAgICAgICBhcHBlbmQoYyk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYyA9PT0gJ1xcXFwnICYmIGluUXVvdGVzKSB7XG4gICAgICAgICAgICBlc2NhcGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjID09PSAnICcgJiYgIWluUXVvdGVzKSB7XG4gICAgICAgICAgICBpZiAoYXJnLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goYXJnKTtcbiAgICAgICAgICAgICAgICBhcmcgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGFwcGVuZChjKTtcbiAgICB9XG4gICAgaWYgKGFyZy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFyZ3MucHVzaChhcmcudHJpbSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGFyZ3M7XG59XG5leHBvcnRzLmFyZ1N0cmluZ1RvQXJyYXkgPSBhcmdTdHJpbmdUb0FycmF5O1xuY2xhc3MgRXhlY1N0YXRlIGV4dGVuZHMgZXZlbnRzLkV2ZW50RW1pdHRlciB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucywgdG9vbFBhdGgpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5wcm9jZXNzQ2xvc2VkID0gZmFsc2U7IC8vIHRyYWNrcyB3aGV0aGVyIHRoZSBwcm9jZXNzIGhhcyBleGl0ZWQgYW5kIHN0ZGlvIGlzIGNsb3NlZFxuICAgICAgICB0aGlzLnByb2Nlc3NFcnJvciA9ICcnO1xuICAgICAgICB0aGlzLnByb2Nlc3NFeGl0Q29kZSA9IDA7XG4gICAgICAgIHRoaXMucHJvY2Vzc0V4aXRlZCA9IGZhbHNlOyAvLyB0cmFja3Mgd2hldGhlciB0aGUgcHJvY2VzcyBoYXMgZXhpdGVkXG4gICAgICAgIHRoaXMucHJvY2Vzc1N0ZGVyciA9IGZhbHNlOyAvLyB0cmFja3Mgd2hldGhlciBzdGRlcnIgd2FzIHdyaXR0ZW4gdG9cbiAgICAgICAgdGhpcy5kZWxheSA9IDEwMDAwOyAvLyAxMCBzZWNvbmRzXG4gICAgICAgIHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRpbWVvdXQgPSBudWxsO1xuICAgICAgICBpZiAoIXRvb2xQYXRoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Rvb2xQYXRoIG11c3Qgbm90IGJlIGVtcHR5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgdGhpcy50b29sUGF0aCA9IHRvb2xQYXRoO1xuICAgICAgICBpZiAob3B0aW9ucy5kZWxheSkge1xuICAgICAgICAgICAgdGhpcy5kZWxheSA9IG9wdGlvbnMuZGVsYXk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgQ2hlY2tDb21wbGV0ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuZG9uZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnByb2Nlc3NDbG9zZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX3NldFJlc3VsdCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMucHJvY2Vzc0V4aXRlZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lb3V0ID0gdGltZXJzXzEuc2V0VGltZW91dChFeGVjU3RhdGUuSGFuZGxlVGltZW91dCwgdGhpcy5kZWxheSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2RlYnVnKG1lc3NhZ2UpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdkZWJ1ZycsIG1lc3NhZ2UpO1xuICAgIH1cbiAgICBfc2V0UmVzdWx0KCkge1xuICAgICAgICAvLyBkZXRlcm1pbmUgd2hldGhlciB0aGVyZSBpcyBhbiBlcnJvclxuICAgICAgICBsZXQgZXJyb3I7XG4gICAgICAgIGlmICh0aGlzLnByb2Nlc3NFeGl0ZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByb2Nlc3NFcnJvcikge1xuICAgICAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKGBUaGVyZSB3YXMgYW4gZXJyb3Igd2hlbiBhdHRlbXB0aW5nIHRvIGV4ZWN1dGUgdGhlIHByb2Nlc3MgJyR7dGhpcy50b29sUGF0aH0nLiBUaGlzIG1heSBpbmRpY2F0ZSB0aGUgcHJvY2VzcyBmYWlsZWQgdG8gc3RhcnQuIEVycm9yOiAke3RoaXMucHJvY2Vzc0Vycm9yfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5wcm9jZXNzRXhpdENvZGUgIT09IDAgJiYgIXRoaXMub3B0aW9ucy5pZ25vcmVSZXR1cm5Db2RlKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoYFRoZSBwcm9jZXNzICcke3RoaXMudG9vbFBhdGh9JyBmYWlsZWQgd2l0aCBleGl0IGNvZGUgJHt0aGlzLnByb2Nlc3NFeGl0Q29kZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMucHJvY2Vzc1N0ZGVyciAmJiB0aGlzLm9wdGlvbnMuZmFpbE9uU3RkRXJyKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoYFRoZSBwcm9jZXNzICcke3RoaXMudG9vbFBhdGh9JyBmYWlsZWQgYmVjYXVzZSBvbmUgb3IgbW9yZSBsaW5lcyB3ZXJlIHdyaXR0ZW4gdG8gdGhlIFNUREVSUiBzdHJlYW1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBjbGVhciB0aGUgdGltZW91dFxuICAgICAgICBpZiAodGhpcy50aW1lb3V0KSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgIHRoaXMudGltZW91dCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kb25lID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5lbWl0KCdkb25lJywgZXJyb3IsIHRoaXMucHJvY2Vzc0V4aXRDb2RlKTtcbiAgICB9XG4gICAgc3RhdGljIEhhbmRsZVRpbWVvdXQoc3RhdGUpIHtcbiAgICAgICAgaWYgKHN0YXRlLmRvbmUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXN0YXRlLnByb2Nlc3NDbG9zZWQgJiYgc3RhdGUucHJvY2Vzc0V4aXRlZCkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGBUaGUgU1RESU8gc3RyZWFtcyBkaWQgbm90IGNsb3NlIHdpdGhpbiAke3N0YXRlLmRlbGF5IC9cbiAgICAgICAgICAgICAgICAxMDAwfSBzZWNvbmRzIG9mIHRoZSBleGl0IGV2ZW50IGZyb20gcHJvY2VzcyAnJHtzdGF0ZS50b29sUGF0aH0nLiBUaGlzIG1heSBpbmRpY2F0ZSBhIGNoaWxkIHByb2Nlc3MgaW5oZXJpdGVkIHRoZSBTVERJTyBzdHJlYW1zIGFuZCBoYXMgbm90IHlldCBleGl0ZWQuYDtcbiAgICAgICAgICAgIHN0YXRlLl9kZWJ1ZyhtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5fc2V0UmVzdWx0KCk7XG4gICAgfVxufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dG9vbHJ1bm5lci5qcy5tYXAiLAogICAgIlwidXNlIHN0cmljdFwiO1xudmFyIF9fY3JlYXRlQmluZGluZyA9ICh0aGlzICYmIHRoaXMuX19jcmVhdGVCaW5kaW5nKSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH0pO1xufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIG9bazJdID0gbVtrXTtcbn0pKTtcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSAodGhpcyAmJiB0aGlzLl9fc2V0TW9kdWxlRGVmYXVsdCkgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcbn0pIDogZnVuY3Rpb24obywgdikge1xuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcbn0pO1xudmFyIF9faW1wb3J0U3RhciA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnRTdGFyKSB8fCBmdW5jdGlvbiAobW9kKSB7XG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5nZXRFeGVjT3V0cHV0ID0gZXhwb3J0cy5leGVjID0gdm9pZCAwO1xuY29uc3Qgc3RyaW5nX2RlY29kZXJfMSA9IHJlcXVpcmUoXCJzdHJpbmdfZGVjb2RlclwiKTtcbmNvbnN0IHRyID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCIuL3Rvb2xydW5uZXJcIikpO1xuLyoqXG4gKiBFeGVjIGEgY29tbWFuZC5cbiAqIE91dHB1dCB3aWxsIGJlIHN0cmVhbWVkIHRvIHRoZSBsaXZlIGNvbnNvbGUuXG4gKiBSZXR1cm5zIHByb21pc2Ugd2l0aCByZXR1cm4gY29kZVxuICpcbiAqIEBwYXJhbSAgICAgY29tbWFuZExpbmUgICAgICAgIGNvbW1hbmQgdG8gZXhlY3V0ZSAoY2FuIGluY2x1ZGUgYWRkaXRpb25hbCBhcmdzKS4gTXVzdCBiZSBjb3JyZWN0bHkgZXNjYXBlZC5cbiAqIEBwYXJhbSAgICAgYXJncyAgICAgICAgICAgICAgIG9wdGlvbmFsIGFyZ3VtZW50cyBmb3IgdG9vbC4gRXNjYXBpbmcgaXMgaGFuZGxlZCBieSB0aGUgbGliLlxuICogQHBhcmFtICAgICBvcHRpb25zICAgICAgICAgICAgb3B0aW9uYWwgZXhlYyBvcHRpb25zLiAgU2VlIEV4ZWNPcHRpb25zXG4gKiBAcmV0dXJucyAgIFByb21pc2U8bnVtYmVyPiAgICBleGl0IGNvZGVcbiAqL1xuZnVuY3Rpb24gZXhlYyhjb21tYW5kTGluZSwgYXJncywgb3B0aW9ucykge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGNvbnN0IGNvbW1hbmRBcmdzID0gdHIuYXJnU3RyaW5nVG9BcnJheShjb21tYW5kTGluZSk7XG4gICAgICAgIGlmIChjb21tYW5kQXJncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGFyYW1ldGVyICdjb21tYW5kTGluZScgY2Fubm90IGJlIG51bGwgb3IgZW1wdHkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUGF0aCB0byB0b29sIHRvIGV4ZWN1dGUgc2hvdWxkIGJlIGZpcnN0IGFyZ1xuICAgICAgICBjb25zdCB0b29sUGF0aCA9IGNvbW1hbmRBcmdzWzBdO1xuICAgICAgICBhcmdzID0gY29tbWFuZEFyZ3Muc2xpY2UoMSkuY29uY2F0KGFyZ3MgfHwgW10pO1xuICAgICAgICBjb25zdCBydW5uZXIgPSBuZXcgdHIuVG9vbFJ1bm5lcih0b29sUGF0aCwgYXJncywgb3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBydW5uZXIuZXhlYygpO1xuICAgIH0pO1xufVxuZXhwb3J0cy5leGVjID0gZXhlYztcbi8qKlxuICogRXhlYyBhIGNvbW1hbmQgYW5kIGdldCB0aGUgb3V0cHV0LlxuICogT3V0cHV0IHdpbGwgYmUgc3RyZWFtZWQgdG8gdGhlIGxpdmUgY29uc29sZS5cbiAqIFJldHVybnMgcHJvbWlzZSB3aXRoIHRoZSBleGl0IGNvZGUgYW5kIGNvbGxlY3RlZCBzdGRvdXQgYW5kIHN0ZGVyclxuICpcbiAqIEBwYXJhbSAgICAgY29tbWFuZExpbmUgICAgICAgICAgIGNvbW1hbmQgdG8gZXhlY3V0ZSAoY2FuIGluY2x1ZGUgYWRkaXRpb25hbCBhcmdzKS4gTXVzdCBiZSBjb3JyZWN0bHkgZXNjYXBlZC5cbiAqIEBwYXJhbSAgICAgYXJncyAgICAgICAgICAgICAgICAgIG9wdGlvbmFsIGFyZ3VtZW50cyBmb3IgdG9vbC4gRXNjYXBpbmcgaXMgaGFuZGxlZCBieSB0aGUgbGliLlxuICogQHBhcmFtICAgICBvcHRpb25zICAgICAgICAgICAgICAgb3B0aW9uYWwgZXhlYyBvcHRpb25zLiAgU2VlIEV4ZWNPcHRpb25zXG4gKiBAcmV0dXJucyAgIFByb21pc2U8RXhlY091dHB1dD4gICBleGl0IGNvZGUsIHN0ZG91dCwgYW5kIHN0ZGVyclxuICovXG5mdW5jdGlvbiBnZXRFeGVjT3V0cHV0KGNvbW1hbmRMaW5lLCBhcmdzLCBvcHRpb25zKSB7XG4gICAgdmFyIF9hLCBfYjtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBsZXQgc3Rkb3V0ID0gJyc7XG4gICAgICAgIGxldCBzdGRlcnIgPSAnJztcbiAgICAgICAgLy9Vc2luZyBzdHJpbmcgZGVjb2RlciBjb3ZlcnMgdGhlIGNhc2Ugd2hlcmUgYSBtdWx0LWJ5dGUgY2hhcmFjdGVyIGlzIHNwbGl0XG4gICAgICAgIGNvbnN0IHN0ZG91dERlY29kZXIgPSBuZXcgc3RyaW5nX2RlY29kZXJfMS5TdHJpbmdEZWNvZGVyKCd1dGY4Jyk7XG4gICAgICAgIGNvbnN0IHN0ZGVyckRlY29kZXIgPSBuZXcgc3RyaW5nX2RlY29kZXJfMS5TdHJpbmdEZWNvZGVyKCd1dGY4Jyk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsU3Rkb3V0TGlzdGVuZXIgPSAoX2EgPSBvcHRpb25zID09PSBudWxsIHx8IG9wdGlvbnMgPT09IHZvaWQgMCA/IHZvaWQgMCA6IG9wdGlvbnMubGlzdGVuZXJzKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2Euc3Rkb3V0O1xuICAgICAgICBjb25zdCBvcmlnaW5hbFN0ZEVyckxpc3RlbmVyID0gKF9iID0gb3B0aW9ucyA9PT0gbnVsbCB8fCBvcHRpb25zID09PSB2b2lkIDAgPyB2b2lkIDAgOiBvcHRpb25zLmxpc3RlbmVycykgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iLnN0ZGVycjtcbiAgICAgICAgY29uc3Qgc3RkRXJyTGlzdGVuZXIgPSAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgc3RkZXJyICs9IHN0ZGVyckRlY29kZXIud3JpdGUoZGF0YSk7XG4gICAgICAgICAgICBpZiAob3JpZ2luYWxTdGRFcnJMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsU3RkRXJyTGlzdGVuZXIoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHN0ZE91dExpc3RlbmVyID0gKGRhdGEpID0+IHtcbiAgICAgICAgICAgIHN0ZG91dCArPSBzdGRvdXREZWNvZGVyLndyaXRlKGRhdGEpO1xuICAgICAgICAgICAgaWYgKG9yaWdpbmFsU3Rkb3V0TGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBvcmlnaW5hbFN0ZG91dExpc3RlbmVyKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBsaXN0ZW5lcnMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMgPT09IG51bGwgfHwgb3B0aW9ucyA9PT0gdm9pZCAwID8gdm9pZCAwIDogb3B0aW9ucy5saXN0ZW5lcnMpLCB7IHN0ZG91dDogc3RkT3V0TGlzdGVuZXIsIHN0ZGVycjogc3RkRXJyTGlzdGVuZXIgfSk7XG4gICAgICAgIGNvbnN0IGV4aXRDb2RlID0geWllbGQgZXhlYyhjb21tYW5kTGluZSwgYXJncywgT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSwgeyBsaXN0ZW5lcnMgfSkpO1xuICAgICAgICAvL2ZsdXNoIGFueSByZW1haW5pbmcgY2hhcmFjdGVyc1xuICAgICAgICBzdGRvdXQgKz0gc3Rkb3V0RGVjb2Rlci5lbmQoKTtcbiAgICAgICAgc3RkZXJyICs9IHN0ZGVyckRlY29kZXIuZW5kKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBleGl0Q29kZSxcbiAgICAgICAgICAgIHN0ZG91dCxcbiAgICAgICAgICAgIHN0ZGVyclxuICAgICAgICB9O1xuICAgIH0pO1xufVxuZXhwb3J0cy5nZXRFeGVjT3V0cHV0ID0gZ2V0RXhlY091dHB1dDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWV4ZWMuanMubWFwIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7OztFQUNBLElBQUksa0JBQW1CLFdBQVEsUUFBSyxvQkFBcUIsT0FBTyxTQUFVLFFBQVEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJO0FBQUEsSUFDNUYsSUFBSSxPQUFPO0FBQUEsTUFBVyxLQUFLO0FBQUEsSUFDM0IsT0FBTyxlQUFlLEdBQUcsSUFBSSxFQUFFLFlBQVksSUFBTSxLQUFLLFFBQVEsR0FBRztBQUFBLE1BQUUsT0FBTyxFQUFFO0FBQUEsTUFBTSxDQUFDO0FBQUEsTUFDakYsUUFBUSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUk7QUFBQSxJQUN4QixJQUFJLE9BQU87QUFBQSxNQUFXLEtBQUs7QUFBQSxJQUMzQixFQUFFLE1BQU0sRUFBRTtBQUFBLE1BRVYscUJBQXNCLFdBQVEsUUFBSyx1QkFBd0IsT0FBTyxTQUFVLFFBQVEsQ0FBQyxHQUFHLEdBQUc7QUFBQSxJQUMzRixPQUFPLGVBQWUsR0FBRyxXQUFXLEVBQUUsWUFBWSxJQUFNLE9BQU8sRUFBRSxDQUFDO0FBQUEsTUFDakUsUUFBUSxDQUFDLEdBQUcsR0FBRztBQUFBLElBQ2hCLEVBQUUsVUFBYTtBQUFBLE1BRWYsZUFBZ0IsV0FBUSxRQUFLLGdCQUFpQixRQUFTLENBQUMsS0FBSztBQUFBLElBQzdELElBQUksT0FBTyxJQUFJO0FBQUEsTUFBWSxPQUFPO0FBQUEsSUFDbEMsSUFBSSxTQUFTLENBQUM7QUFBQSxJQUNkLElBQUksT0FBTztBQUFBLE1BQU0sU0FBUyxLQUFLO0FBQUEsUUFBSyxJQUFJLE1BQU0sYUFBYSxPQUFPLGVBQWUsS0FBSyxLQUFLLENBQUM7QUFBQSxVQUFHLGdCQUFnQixRQUFRLEtBQUssQ0FBQztBQUFBO0FBQUEsSUFFN0gsT0FEQSxtQkFBbUIsUUFBUSxHQUFHLEdBQ3ZCO0FBQUEsS0FFUCxZQUFhLFdBQVEsUUFBSyxhQUFjLFFBQVMsQ0FBQyxTQUFTLFlBQVksR0FBRyxXQUFXO0FBQUEsSUFDckYsU0FBUyxLQUFLLENBQUMsT0FBTztBQUFBLE1BQUUsT0FBTyxpQkFBaUIsSUFBSSxRQUFRLElBQUksRUFBRSxRQUFTLENBQUMsU0FBUztBQUFBLFFBQUUsUUFBUSxLQUFLO0FBQUEsT0FBSTtBQUFBO0FBQUEsSUFDeEcsT0FBTyxLQUFLLE1BQU0sSUFBSSxVQUFVLFFBQVMsQ0FBQyxTQUFTLFFBQVE7QUFBQSxNQUN2RCxTQUFTLFNBQVMsQ0FBQyxPQUFPO0FBQUEsUUFBRSxJQUFJO0FBQUEsVUFBRSxLQUFLLFVBQVUsS0FBSyxLQUFLLENBQUM7QUFBQSxVQUFLLE9BQU8sR0FBRztBQUFBLFVBQUUsT0FBTyxDQUFDO0FBQUE7QUFBQTtBQUFBLE1BQ3JGLFNBQVMsUUFBUSxDQUFDLE9BQU87QUFBQSxRQUFFLElBQUk7QUFBQSxVQUFFLEtBQUssVUFBVSxNQUFTLEtBQUssQ0FBQztBQUFBLFVBQUssT0FBTyxHQUFHO0FBQUEsVUFBRSxPQUFPLENBQUM7QUFBQTtBQUFBO0FBQUEsTUFDeEYsU0FBUyxJQUFJLENBQUMsUUFBUTtBQUFBLFFBQUUsT0FBTyxPQUFPLFFBQVEsT0FBTyxLQUFLLElBQUksTUFBTSxPQUFPLEtBQUssRUFBRSxLQUFLLFdBQVcsUUFBUTtBQUFBO0FBQUEsTUFDMUcsTUFBTSxZQUFZLFVBQVUsTUFBTSxTQUFTLGNBQWMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO0FBQUEsS0FDdkU7QUFBQSxLQUVEO0FBQUEsRUFDSixPQUFPLGVBQWUsU0FBUyxjQUFjLEVBQUUsT0FBTyxHQUFLLENBQUM7QUFBQSxFQUM1RCxRQUFRLGFBQWEsUUFBUSx1QkFBdUIsUUFBUSxXQUFXLFFBQVEsY0FBYyxRQUFRLFNBQVMsUUFBUSxXQUFXLFFBQVEsaUJBQWlCLFFBQVEsYUFBYSxRQUFRLFNBQVMsUUFBUSxVQUFVLFFBQVEsT0FBTyxRQUFRLFFBQVEsUUFBUSxLQUFLLFFBQVEsU0FBUyxRQUFRLFdBQVcsUUFBUSxVQUFVLFFBQVEsT0FBTyxRQUFRLFFBQVEsUUFBUSxRQUFRLFFBQVEsV0FBVyxRQUFRLFFBQWE7QUFBQSxFQUMzWSxJQUFNLEtBQUssNEJBQTBCLEdBQy9CLE9BQU8sOEJBQTRCO0FBQUEsRUFDekMsS0FBSyxHQUFHLFVBRU4sUUFBUSxRQUFRLEdBQUcsT0FBTyxRQUFRLFdBQVcsR0FBRyxVQUFVLFFBQVEsUUFBUSxHQUFHLE9BQU8sUUFBUSxRQUFRLEdBQUcsT0FBTyxRQUFRLE9BQU8sR0FBRyxNQUFNLFFBQVEsVUFBVSxHQUFHLFNBQVMsUUFBUSxXQUFXLEdBQUcsVUFBVSxRQUFRLFNBQVMsR0FBRyxRQUFRLFFBQVEsS0FBSyxHQUFHLElBQUksUUFBUSxRQUFRLEdBQUcsT0FBTyxRQUFRLE9BQU8sR0FBRyxNQUFNLFFBQVEsVUFBVSxHQUFHLFNBQVMsUUFBUSxTQUFTLEdBQUc7QUFBQSxFQUUxVixRQUFRLGFBQWEsUUFBUSxhQUFhO0FBQUEsRUFFMUMsUUFBUSxpQkFBaUI7QUFBQSxFQUN6QixRQUFRLFdBQVcsR0FBRyxVQUFVO0FBQUEsRUFDaEMsU0FBUyxNQUFNLENBQUMsUUFBUTtBQUFBLElBQ3BCLE9BQU8sVUFBVSxNQUFXLFFBQVEsUUFBRyxVQUFVLEdBQUc7QUFBQSxNQUNoRCxJQUFJO0FBQUEsUUFDQSxNQUFNLFFBQVEsS0FBSyxNQUFNO0FBQUEsUUFFN0IsT0FBTyxLQUFLO0FBQUEsUUFDUixJQUFJLElBQUksU0FBUztBQUFBLFVBQ2IsT0FBTztBQUFBLFFBRVgsTUFBTTtBQUFBO0FBQUEsTUFFVixPQUFPO0FBQUEsS0FDVjtBQUFBO0FBQUEsRUFFTCxRQUFRLFNBQVM7QUFBQSxFQUNqQixTQUFTLFdBQVcsQ0FBQyxRQUFRLFVBQVUsSUFBTztBQUFBLElBQzFDLE9BQU8sVUFBVSxNQUFXLFFBQVEsUUFBRyxVQUFVLEdBQUc7QUFBQSxNQUVoRCxRQURjLFVBQVUsTUFBTSxRQUFRLEtBQUssTUFBTSxJQUFJLE1BQU0sUUFBUSxNQUFNLE1BQU0sR0FDbEUsWUFBWTtBQUFBLEtBQzVCO0FBQUE7QUFBQSxFQUVMLFFBQVEsY0FBYztBQUFBLEVBS3RCLFNBQVMsUUFBUSxDQUFDLEdBQUc7QUFBQSxJQUVqQixJQURBLElBQUksb0JBQW9CLENBQUMsR0FDckIsQ0FBQztBQUFBLE1BQ0QsTUFBVSxNQUFNLDBDQUEwQztBQUFBLElBRTlELElBQUksUUFBUTtBQUFBLE1BQ1IsT0FBUSxFQUFFLFdBQVcsSUFBSSxLQUFLLFdBQVcsS0FBSyxDQUFDO0FBQUEsSUFHbkQsT0FBTyxFQUFFLFdBQVcsR0FBRztBQUFBO0FBQUEsRUFFM0IsUUFBUSxXQUFXO0FBQUEsRUFPbkIsU0FBUyxvQkFBb0IsQ0FBQyxVQUFVLFlBQVk7QUFBQSxJQUNoRCxPQUFPLFVBQVUsTUFBVyxRQUFRLFFBQUcsVUFBVSxHQUFHO0FBQUEsTUFDaEQsSUFBSSxRQUFRO0FBQUEsTUFDWixJQUFJO0FBQUEsUUFFQSxRQUFRLE1BQU0sUUFBUSxLQUFLLFFBQVE7QUFBQSxRQUV2QyxPQUFPLEtBQUs7QUFBQSxRQUNSLElBQUksSUFBSSxTQUFTO0FBQUEsVUFFYixRQUFRLElBQUksdUVBQXVFLGNBQWMsS0FBSztBQUFBO0FBQUEsTUFHOUcsSUFBSSxTQUFTLE1BQU0sT0FBTztBQUFBLFFBQ3RCLElBQUksUUFBUSxZQUFZO0FBQUEsVUFFcEIsSUFBTSxXQUFXLEtBQUssUUFBUSxRQUFRLEVBQUUsWUFBWTtBQUFBLFVBQ3BELElBQUksV0FBVyxLQUFLLGNBQVksU0FBUyxZQUFZLE1BQU0sUUFBUTtBQUFBLFlBQy9ELE9BQU87QUFBQSxVQUlYLFNBQUksaUJBQWlCLEtBQUs7QUFBQSxVQUN0QixPQUFPO0FBQUE7QUFBQSxNQUtuQixJQUFNLG1CQUFtQjtBQUFBLE1BQ3pCLFNBQVcsYUFBYSxZQUFZO0FBQUEsUUFDaEMsV0FBVyxtQkFBbUIsV0FDOUIsUUFBUTtBQUFBLFFBQ1IsSUFBSTtBQUFBLFVBQ0EsUUFBUSxNQUFNLFFBQVEsS0FBSyxRQUFRO0FBQUEsVUFFdkMsT0FBTyxLQUFLO0FBQUEsVUFDUixJQUFJLElBQUksU0FBUztBQUFBLFlBRWIsUUFBUSxJQUFJLHVFQUF1RSxjQUFjLEtBQUs7QUFBQTtBQUFBLFFBRzlHLElBQUksU0FBUyxNQUFNLE9BQU87QUFBQSxVQUN0QixJQUFJLFFBQVEsWUFBWTtBQUFBLFlBRXBCLElBQUk7QUFBQSxjQUNBLElBQU0sWUFBWSxLQUFLLFFBQVEsUUFBUSxHQUNqQyxZQUFZLEtBQUssU0FBUyxRQUFRLEVBQUUsWUFBWTtBQUFBLGNBQ3RELFNBQVcsY0FBYyxNQUFNLFFBQVEsUUFBUSxTQUFTO0FBQUEsZ0JBQ3BELElBQUksY0FBYyxXQUFXLFlBQVksR0FBRztBQUFBLGtCQUN4QyxXQUFXLEtBQUssS0FBSyxXQUFXLFVBQVU7QUFBQSxrQkFDMUM7QUFBQTtBQUFBLGNBSVosT0FBTyxLQUFLO0FBQUEsY0FFUixRQUFRLElBQUkseUVBQXlFLGNBQWMsS0FBSztBQUFBO0FBQUEsWUFFNUcsT0FBTztBQUFBLFlBR1AsU0FBSSxpQkFBaUIsS0FBSztBQUFBLFlBQ3RCLE9BQU87QUFBQTtBQUFBO0FBQUEsTUFLdkIsT0FBTztBQUFBLEtBQ1Y7QUFBQTtBQUFBLEVBRUwsUUFBUSx1QkFBdUI7QUFBQSxFQUMvQixTQUFTLG1CQUFtQixDQUFDLEdBQUc7QUFBQSxJQUU1QixJQURBLElBQUksS0FBSyxJQUNMLFFBQVE7QUFBQSxNQUlSLE9BRkEsSUFBSSxFQUFFLFFBQVEsT0FBTyxJQUFJLEdBRWxCLEVBQUUsUUFBUSxVQUFVLElBQUk7QUFBQSxJQUduQyxPQUFPLEVBQUUsUUFBUSxVQUFVLEdBQUc7QUFBQTtBQUFBLEVBS2xDLFNBQVMsZ0JBQWdCLENBQUMsT0FBTztBQUFBLElBQzdCLFFBQVMsTUFBTSxPQUFPLEtBQUssTUFDckIsTUFBTSxPQUFPLEtBQUssS0FBSyxNQUFNLFFBQVEsUUFBUSxPQUFPLE1BQ3BELE1BQU0sT0FBTyxNQUFNLEtBQUssTUFBTSxRQUFRLFFBQVEsT0FBTztBQUFBO0FBQUEsRUFHL0QsU0FBUyxVQUFVLEdBQUc7QUFBQSxJQUNsQixJQUFJO0FBQUEsSUFDSixRQUFRLE1BQUssUUFBUSxJQUFJLGFBQWdCLFFBQVEsUUFBWSxTQUFJLE1BQUs7QUFBQTtBQUFBLEVBRTFFLFFBQVEsYUFBYTtBQUFBOzs7O0VDcExyQixJQUFJLGtCQUFtQixXQUFRLFFBQUssb0JBQXFCLE9BQU8sU0FBVSxRQUFRLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSTtBQUFBLElBQzVGLElBQUksT0FBTztBQUFBLE1BQVcsS0FBSztBQUFBLElBQzNCLE9BQU8sZUFBZSxHQUFHLElBQUksRUFBRSxZQUFZLElBQU0sS0FBSyxRQUFRLEdBQUc7QUFBQSxNQUFFLE9BQU8sRUFBRTtBQUFBLE1BQU0sQ0FBQztBQUFBLE1BQ2pGLFFBQVEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJO0FBQUEsSUFDeEIsSUFBSSxPQUFPO0FBQUEsTUFBVyxLQUFLO0FBQUEsSUFDM0IsRUFBRSxNQUFNLEVBQUU7QUFBQSxNQUVWLHFCQUFzQixXQUFRLFFBQUssdUJBQXdCLE9BQU8sU0FBVSxRQUFRLENBQUMsR0FBRyxHQUFHO0FBQUEsSUFDM0YsT0FBTyxlQUFlLEdBQUcsV0FBVyxFQUFFLFlBQVksSUFBTSxPQUFPLEVBQUUsQ0FBQztBQUFBLE1BQ2pFLFFBQVEsQ0FBQyxHQUFHLEdBQUc7QUFBQSxJQUNoQixFQUFFLFVBQWE7QUFBQSxNQUVmLGVBQWdCLFdBQVEsUUFBSyxnQkFBaUIsUUFBUyxDQUFDLEtBQUs7QUFBQSxJQUM3RCxJQUFJLE9BQU8sSUFBSTtBQUFBLE1BQVksT0FBTztBQUFBLElBQ2xDLElBQUksU0FBUyxDQUFDO0FBQUEsSUFDZCxJQUFJLE9BQU87QUFBQSxNQUFNLFNBQVMsS0FBSztBQUFBLFFBQUssSUFBSSxNQUFNLGFBQWEsT0FBTyxlQUFlLEtBQUssS0FBSyxDQUFDO0FBQUEsVUFBRyxnQkFBZ0IsUUFBUSxLQUFLLENBQUM7QUFBQTtBQUFBLElBRTdILE9BREEsbUJBQW1CLFFBQVEsR0FBRyxHQUN2QjtBQUFBLEtBRVAsWUFBYSxXQUFRLFFBQUssYUFBYyxRQUFTLENBQUMsU0FBUyxZQUFZLEdBQUcsV0FBVztBQUFBLElBQ3JGLFNBQVMsS0FBSyxDQUFDLE9BQU87QUFBQSxNQUFFLE9BQU8saUJBQWlCLElBQUksUUFBUSxJQUFJLEVBQUUsUUFBUyxDQUFDLFNBQVM7QUFBQSxRQUFFLFFBQVEsS0FBSztBQUFBLE9BQUk7QUFBQTtBQUFBLElBQ3hHLE9BQU8sS0FBSyxNQUFNLElBQUksVUFBVSxRQUFTLENBQUMsU0FBUyxRQUFRO0FBQUEsTUFDdkQsU0FBUyxTQUFTLENBQUMsT0FBTztBQUFBLFFBQUUsSUFBSTtBQUFBLFVBQUUsS0FBSyxVQUFVLEtBQUssS0FBSyxDQUFDO0FBQUEsVUFBSyxPQUFPLEdBQUc7QUFBQSxVQUFFLE9BQU8sQ0FBQztBQUFBO0FBQUE7QUFBQSxNQUNyRixTQUFTLFFBQVEsQ0FBQyxPQUFPO0FBQUEsUUFBRSxJQUFJO0FBQUEsVUFBRSxLQUFLLFVBQVUsTUFBUyxLQUFLLENBQUM7QUFBQSxVQUFLLE9BQU8sR0FBRztBQUFBLFVBQUUsT0FBTyxDQUFDO0FBQUE7QUFBQTtBQUFBLE1BQ3hGLFNBQVMsSUFBSSxDQUFDLFFBQVE7QUFBQSxRQUFFLE9BQU8sT0FBTyxRQUFRLE9BQU8sS0FBSyxJQUFJLE1BQU0sT0FBTyxLQUFLLEVBQUUsS0FBSyxXQUFXLFFBQVE7QUFBQTtBQUFBLE1BQzFHLE1BQU0sWUFBWSxVQUFVLE1BQU0sU0FBUyxjQUFjLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztBQUFBLEtBQ3ZFO0FBQUE7QUFBQSxFQUVMLE9BQU8sZUFBZSxTQUFTLGNBQWMsRUFBRSxPQUFPLEdBQUssQ0FBQztBQUFBLEVBQzVELFFBQVEsYUFBYSxRQUFRLFFBQVEsUUFBUSxTQUFTLFFBQVEsT0FBTyxRQUFRLEtBQUssUUFBUSxLQUFVO0FBQUEsRUFDcEcsSUFBTSxnQ0FDQSxPQUFPLDhCQUE0QixHQUNuQyxTQUFTLDhCQUFpQztBQUFBLEVBU2hELFNBQVMsRUFBRSxDQUFDLFFBQVEsTUFBTSxVQUFVLENBQUMsR0FBRztBQUFBLElBQ3BDLE9BQU8sVUFBVSxNQUFXLFFBQVEsUUFBRyxVQUFVLEdBQUc7QUFBQSxNQUNoRCxNQUFRLE9BQU8sV0FBVyx3QkFBd0IsZ0JBQWdCLE9BQU8sR0FDbkUsWUFBWSxNQUFNLE9BQU8sT0FBTyxJQUFJLEtBQUssTUFBTSxPQUFPLEtBQUssSUFBSSxJQUFJO0FBQUEsTUFFekUsSUFBSSxZQUFZLFNBQVMsT0FBTyxLQUFLLENBQUM7QUFBQSxRQUNsQztBQUFBLE1BR0osSUFBTSxVQUFVLFlBQVksU0FBUyxZQUFZLEtBQUssc0JBQ2hELEtBQUssS0FBSyxNQUFNLEtBQUssU0FBUyxNQUFNLENBQUMsSUFDckM7QUFBQSxNQUNOLElBQUksRUFBRSxNQUFNLE9BQU8sT0FBTyxNQUFNO0FBQUEsUUFDNUIsTUFBVSxNQUFNLDhCQUE4QixRQUFRO0FBQUEsTUFHMUQsS0FEbUIsTUFBTSxPQUFPLEtBQUssTUFBTSxHQUM1QixZQUFZO0FBQUEsUUFDdkIsSUFBSSxDQUFDO0FBQUEsVUFDRCxNQUFVLE1BQU0sbUJBQW1CLGtFQUFrRTtBQUFBLFFBR3JHO0FBQUEsZ0JBQU0sZUFBZSxRQUFRLFNBQVMsR0FBRyxLQUFLO0FBQUEsTUFHakQ7QUFBQSxRQUNELElBQUksS0FBSyxTQUFTLFFBQVEsT0FBTyxNQUFNO0FBQUEsVUFFbkMsTUFBVSxNQUFNLElBQUksaUJBQWlCLDJCQUEyQjtBQUFBLFFBRXBFLE1BQU0sU0FBUyxRQUFRLFNBQVMsS0FBSztBQUFBO0FBQUEsS0FFNUM7QUFBQTtBQUFBLEVBRUwsUUFBUSxLQUFLO0FBQUEsRUFRYixTQUFTLEVBQUUsQ0FBQyxRQUFRLE1BQU0sVUFBVSxDQUFDLEdBQUc7QUFBQSxJQUNwQyxPQUFPLFVBQVUsTUFBVyxRQUFRLFFBQUcsVUFBVSxHQUFHO0FBQUEsTUFDaEQsSUFBSSxNQUFNLE9BQU8sT0FBTyxJQUFJLEdBQUc7QUFBQSxRQUMzQixJQUFJLGFBQWE7QUFBQSxRQUNqQixJQUFJLE1BQU0sT0FBTyxZQUFZLElBQUk7QUFBQSxVQUU3QixPQUFPLEtBQUssS0FBSyxNQUFNLEtBQUssU0FBUyxNQUFNLENBQUMsR0FDNUMsYUFBYSxNQUFNLE9BQU8sT0FBTyxJQUFJO0FBQUEsUUFFekMsSUFBSTtBQUFBLFVBQ0EsSUFBSSxRQUFRLFNBQVMsUUFBUSxRQUFRO0FBQUEsWUFDakMsTUFBTSxLQUFLLElBQUk7QUFBQSxVQUdmO0FBQUEsa0JBQVUsTUFBTSw0QkFBNEI7QUFBQTtBQUFBLE1BSXhELE1BQU0sT0FBTyxLQUFLLFFBQVEsSUFBSSxDQUFDLEdBQy9CLE1BQU0sT0FBTyxPQUFPLFFBQVEsSUFBSTtBQUFBLEtBQ25DO0FBQUE7QUFBQSxFQUVMLFFBQVEsS0FBSztBQUFBLEVBTWIsU0FBUyxJQUFJLENBQUMsV0FBVztBQUFBLElBQ3JCLE9BQU8sVUFBVSxNQUFXLFFBQVEsUUFBRyxVQUFVLEdBQUc7QUFBQSxNQUNoRCxJQUFJLE9BQU87QUFBQSxRQUdQLElBQUksVUFBVSxLQUFLLFNBQVM7QUFBQSxVQUN4QixNQUFVLE1BQU0saUVBQWlFO0FBQUE7QUFBQSxNQUd6RixJQUFJO0FBQUEsUUFFQSxNQUFNLE9BQU8sR0FBRyxXQUFXO0FBQUEsVUFDdkIsT0FBTztBQUFBLFVBQ1AsWUFBWTtBQUFBLFVBQ1osV0FBVztBQUFBLFVBQ1gsWUFBWTtBQUFBLFFBQ2hCLENBQUM7QUFBQSxRQUVMLE9BQU8sS0FBSztBQUFBLFFBQ1IsTUFBVSxNQUFNLGlDQUFpQyxLQUFLO0FBQUE7QUFBQSxLQUU3RDtBQUFBO0FBQUEsRUFFTCxRQUFRLE9BQU87QUFBQSxFQVFmLFNBQVMsTUFBTSxDQUFDLFFBQVE7QUFBQSxJQUNwQixPQUFPLFVBQVUsTUFBVyxRQUFRLFFBQUcsVUFBVSxHQUFHO0FBQUEsTUFDaEQsU0FBUyxHQUFHLFFBQVEsa0NBQWtDLEdBQ3RELE1BQU0sT0FBTyxNQUFNLFFBQVEsRUFBRSxXQUFXLEdBQUssQ0FBQztBQUFBLEtBQ2pEO0FBQUE7QUFBQSxFQUVMLFFBQVEsU0FBUztBQUFBLEVBU2pCLFNBQVMsS0FBSyxDQUFDLE1BQU0sT0FBTztBQUFBLElBQ3hCLE9BQU8sVUFBVSxNQUFXLFFBQVEsUUFBRyxVQUFVLEdBQUc7QUFBQSxNQUNoRCxJQUFJLENBQUM7QUFBQSxRQUNELE1BQVUsTUFBTSw4QkFBOEI7QUFBQSxNQUdsRCxJQUFJLE9BQU87QUFBQSxRQUNQLElBQU0sU0FBUyxNQUFNLE1BQU0sTUFBTSxFQUFLO0FBQUEsUUFDdEMsSUFBSSxDQUFDO0FBQUEsVUFDRCxJQUFJLE9BQU87QUFBQSxZQUNQLE1BQVUsTUFBTSxxQ0FBcUMsNE1BQTRNO0FBQUEsVUFHalE7QUFBQSxrQkFBVSxNQUFNLHFDQUFxQyxvTUFBb007QUFBQSxRQUdqUSxPQUFPO0FBQUE7QUFBQSxNQUVYLElBQU0sVUFBVSxNQUFNLFdBQVcsSUFBSTtBQUFBLE1BQ3JDLElBQUksV0FBVyxRQUFRLFNBQVM7QUFBQSxRQUM1QixPQUFPLFFBQVE7QUFBQSxNQUVuQixPQUFPO0FBQUEsS0FDVjtBQUFBO0FBQUEsRUFFTCxRQUFRLFFBQVE7QUFBQSxFQU1oQixTQUFTLFVBQVUsQ0FBQyxNQUFNO0FBQUEsSUFDdEIsT0FBTyxVQUFVLE1BQVcsUUFBUSxRQUFHLFVBQVUsR0FBRztBQUFBLE1BQ2hELElBQUksQ0FBQztBQUFBLFFBQ0QsTUFBVSxNQUFNLDhCQUE4QjtBQUFBLE1BR2xELElBQU0sYUFBYSxDQUFDO0FBQUEsTUFDcEIsSUFBSSxPQUFPLGNBQWMsUUFBUSxJQUFJO0FBQUEsUUFDakMsU0FBVyxhQUFhLFFBQVEsSUFBSSxRQUFXLE1BQU0sS0FBSyxTQUFTO0FBQUEsVUFDL0QsSUFBSTtBQUFBLFlBQ0EsV0FBVyxLQUFLLFNBQVM7QUFBQTtBQUFBLE1BS3JDLElBQUksT0FBTyxTQUFTLElBQUksR0FBRztBQUFBLFFBQ3ZCLElBQU0sV0FBVyxNQUFNLE9BQU8scUJBQXFCLE1BQU0sVUFBVTtBQUFBLFFBQ25FLElBQUk7QUFBQSxVQUNBLE9BQU8sQ0FBQyxRQUFRO0FBQUEsUUFFcEIsT0FBTyxDQUFDO0FBQUE7QUFBQSxNQUdaLElBQUksS0FBSyxTQUFTLEtBQUssR0FBRztBQUFBLFFBQ3RCLE9BQU8sQ0FBQztBQUFBLE1BUVosSUFBTSxjQUFjLENBQUM7QUFBQSxNQUNyQixJQUFJLFFBQVEsSUFBSTtBQUFBLFFBQ1osU0FBVyxLQUFLLFFBQVEsSUFBSSxLQUFLLE1BQU0sS0FBSyxTQUFTO0FBQUEsVUFDakQsSUFBSTtBQUFBLFlBQ0EsWUFBWSxLQUFLLENBQUM7QUFBQTtBQUFBLE1BSzlCLElBQU0sVUFBVSxDQUFDO0FBQUEsTUFDakIsU0FBVyxhQUFhLGFBQWE7QUFBQSxRQUNqQyxJQUFNLFdBQVcsTUFBTSxPQUFPLHFCQUFxQixLQUFLLEtBQUssV0FBVyxJQUFJLEdBQUcsVUFBVTtBQUFBLFFBQ3pGLElBQUk7QUFBQSxVQUNBLFFBQVEsS0FBSyxRQUFRO0FBQUE7QUFBQSxNQUc3QixPQUFPO0FBQUEsS0FDVjtBQUFBO0FBQUEsRUFFTCxRQUFRLGFBQWE7QUFBQSxFQUNyQixTQUFTLGVBQWUsQ0FBQyxTQUFTO0FBQUEsSUFDOUIsSUFBTSxRQUFRLFFBQVEsU0FBUyxPQUFPLEtBQU8sUUFBUSxPQUMvQyxZQUFZLFFBQVEsUUFBUSxTQUFTLEdBQ3JDLHNCQUFzQixRQUFRLHVCQUF1QixPQUNyRCxLQUNBLFFBQVEsUUFBUSxtQkFBbUI7QUFBQSxJQUN6QyxPQUFPLEVBQUUsT0FBTyxXQUFXLG9CQUFvQjtBQUFBO0FBQUEsRUFFbkQsU0FBUyxjQUFjLENBQUMsV0FBVyxTQUFTLGNBQWMsT0FBTztBQUFBLElBQzdELE9BQU8sVUFBVSxNQUFXLFFBQVEsUUFBRyxVQUFVLEdBQUc7QUFBQSxNQUVoRCxJQUFJLGdCQUFnQjtBQUFBLFFBQ2hCO0FBQUEsTUFDSixnQkFDQSxNQUFNLE9BQU8sT0FBTztBQUFBLE1BQ3BCLElBQU0sUUFBUSxNQUFNLE9BQU8sUUFBUSxTQUFTO0FBQUEsTUFDNUMsU0FBVyxZQUFZLE9BQU87QUFBQSxRQUMxQixJQUFNLFVBQVUsR0FBRyxhQUFhLFlBQzFCLFdBQVcsR0FBRyxXQUFXO0FBQUEsUUFFL0IsS0FEb0IsTUFBTSxPQUFPLE1BQU0sT0FBTyxHQUM5QixZQUFZO0FBQUEsVUFFeEIsTUFBTSxlQUFlLFNBQVMsVUFBVSxjQUFjLEtBQUs7QUFBQSxRQUczRDtBQUFBLGdCQUFNLFNBQVMsU0FBUyxVQUFVLEtBQUs7QUFBQTtBQUFBLE1BSS9DLE1BQU0sT0FBTyxNQUFNLFVBQVUsTUFBTSxPQUFPLEtBQUssU0FBUyxHQUFHLElBQUk7QUFBQSxLQUNsRTtBQUFBO0FBQUEsRUFHTCxTQUFTLFFBQVEsQ0FBQyxTQUFTLFVBQVUsT0FBTztBQUFBLElBQ3hDLE9BQU8sVUFBVSxNQUFXLFFBQVEsUUFBRyxVQUFVLEdBQUc7QUFBQSxNQUNoRCxLQUFLLE1BQU0sT0FBTyxNQUFNLE9BQU8sR0FBRyxlQUFlLEdBQUc7QUFBQSxRQUVoRCxJQUFJO0FBQUEsVUFDQSxNQUFNLE9BQU8sTUFBTSxRQUFRLEdBQzNCLE1BQU0sT0FBTyxPQUFPLFFBQVE7QUFBQSxVQUVoQyxPQUFPLEdBQUc7QUFBQSxVQUVOLElBQUksRUFBRSxTQUFTO0FBQUEsWUFDWCxNQUFNLE9BQU8sTUFBTSxVQUFVLE1BQU0sR0FDbkMsTUFBTSxPQUFPLE9BQU8sUUFBUTtBQUFBO0FBQUEsUUFLcEMsSUFBTSxjQUFjLE1BQU0sT0FBTyxTQUFTLE9BQU87QUFBQSxRQUNqRCxNQUFNLE9BQU8sUUFBUSxhQUFhLFVBQVUsT0FBTyxhQUFhLGFBQWEsSUFBSTtBQUFBLFFBRWhGLFNBQUksRUFBRSxNQUFNLE9BQU8sT0FBTyxRQUFRLE1BQU07QUFBQSxRQUN6QyxNQUFNLE9BQU8sU0FBUyxTQUFTLFFBQVE7QUFBQSxLQUU5QztBQUFBO0FBQUE7Ozs7RUN2U0wsSUFBSSxrQkFBbUIsV0FBUSxRQUFLLG9CQUFxQixPQUFPLFNBQVUsUUFBUSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUk7QUFBQSxJQUM1RixJQUFJLE9BQU87QUFBQSxNQUFXLEtBQUs7QUFBQSxJQUMzQixPQUFPLGVBQWUsR0FBRyxJQUFJLEVBQUUsWUFBWSxJQUFNLEtBQUssUUFBUSxHQUFHO0FBQUEsTUFBRSxPQUFPLEVBQUU7QUFBQSxNQUFNLENBQUM7QUFBQSxNQUNqRixRQUFRLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSTtBQUFBLElBQ3hCLElBQUksT0FBTztBQUFBLE1BQVcsS0FBSztBQUFBLElBQzNCLEVBQUUsTUFBTSxFQUFFO0FBQUEsTUFFVixxQkFBc0IsV0FBUSxRQUFLLHVCQUF3QixPQUFPLFNBQVUsUUFBUSxDQUFDLEdBQUcsR0FBRztBQUFBLElBQzNGLE9BQU8sZUFBZSxHQUFHLFdBQVcsRUFBRSxZQUFZLElBQU0sT0FBTyxFQUFFLENBQUM7QUFBQSxNQUNqRSxRQUFRLENBQUMsR0FBRyxHQUFHO0FBQUEsSUFDaEIsRUFBRSxVQUFhO0FBQUEsTUFFZixlQUFnQixXQUFRLFFBQUssZ0JBQWlCLFFBQVMsQ0FBQyxLQUFLO0FBQUEsSUFDN0QsSUFBSSxPQUFPLElBQUk7QUFBQSxNQUFZLE9BQU87QUFBQSxJQUNsQyxJQUFJLFNBQVMsQ0FBQztBQUFBLElBQ2QsSUFBSSxPQUFPO0FBQUEsTUFBTSxTQUFTLEtBQUs7QUFBQSxRQUFLLElBQUksTUFBTSxhQUFhLE9BQU8sZUFBZSxLQUFLLEtBQUssQ0FBQztBQUFBLFVBQUcsZ0JBQWdCLFFBQVEsS0FBSyxDQUFDO0FBQUE7QUFBQSxJQUU3SCxPQURBLG1CQUFtQixRQUFRLEdBQUcsR0FDdkI7QUFBQSxLQUVQLFlBQWEsV0FBUSxRQUFLLGFBQWMsUUFBUyxDQUFDLFNBQVMsWUFBWSxHQUFHLFdBQVc7QUFBQSxJQUNyRixTQUFTLEtBQUssQ0FBQyxPQUFPO0FBQUEsTUFBRSxPQUFPLGlCQUFpQixJQUFJLFFBQVEsSUFBSSxFQUFFLFFBQVMsQ0FBQyxTQUFTO0FBQUEsUUFBRSxRQUFRLEtBQUs7QUFBQSxPQUFJO0FBQUE7QUFBQSxJQUN4RyxPQUFPLEtBQUssTUFBTSxJQUFJLFVBQVUsUUFBUyxDQUFDLFNBQVMsUUFBUTtBQUFBLE1BQ3ZELFNBQVMsU0FBUyxDQUFDLE9BQU87QUFBQSxRQUFFLElBQUk7QUFBQSxVQUFFLEtBQUssVUFBVSxLQUFLLEtBQUssQ0FBQztBQUFBLFVBQUssT0FBTyxHQUFHO0FBQUEsVUFBRSxPQUFPLENBQUM7QUFBQTtBQUFBO0FBQUEsTUFDckYsU0FBUyxRQUFRLENBQUMsT0FBTztBQUFBLFFBQUUsSUFBSTtBQUFBLFVBQUUsS0FBSyxVQUFVLE1BQVMsS0FBSyxDQUFDO0FBQUEsVUFBSyxPQUFPLEdBQUc7QUFBQSxVQUFFLE9BQU8sQ0FBQztBQUFBO0FBQUE7QUFBQSxNQUN4RixTQUFTLElBQUksQ0FBQyxRQUFRO0FBQUEsUUFBRSxPQUFPLE9BQU8sUUFBUSxPQUFPLEtBQUssSUFBSSxNQUFNLE9BQU8sS0FBSyxFQUFFLEtBQUssV0FBVyxRQUFRO0FBQUE7QUFBQSxNQUMxRyxNQUFNLFlBQVksVUFBVSxNQUFNLFNBQVMsY0FBYyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7QUFBQSxLQUN2RTtBQUFBO0FBQUEsRUFFTCxPQUFPLGVBQWUsU0FBUyxjQUFjLEVBQUUsT0FBTyxHQUFLLENBQUM7QUFBQSxFQUM1RCxRQUFRLG1CQUFtQixRQUFRLGFBQWtCO0FBQUEsRUFDckQsSUFBTSxLQUFLLDRCQUEwQixHQUMvQixTQUFTLGdDQUE4QixHQUN2QyxRQUFRLHVDQUFxQyxHQUM3QyxPQUFPLDhCQUE0QixHQUNuQyxLQUFLLHlCQUFtQyxHQUN4QyxTQUFTLDhCQUErQyxHQUN4RCxnQ0FFQSxhQUFhLFFBQVEsYUFBYTtBQUFBO0FBQUEsRUFJeEMsTUFBTSxtQkFBbUIsT0FBTyxhQUFhO0FBQUEsSUFDekMsV0FBVyxDQUFDLFVBQVUsTUFBTSxTQUFTO0FBQUEsTUFDakMsTUFBTTtBQUFBLE1BQ04sSUFBSSxDQUFDO0FBQUEsUUFDRCxNQUFVLE1BQU0sK0NBQStDO0FBQUEsTUFFbkUsS0FBSyxXQUFXLFVBQ2hCLEtBQUssT0FBTyxRQUFRLENBQUMsR0FDckIsS0FBSyxVQUFVLFdBQVcsQ0FBQztBQUFBO0FBQUEsSUFFL0IsTUFBTSxDQUFDLFNBQVM7QUFBQSxNQUNaLElBQUksS0FBSyxRQUFRLGFBQWEsS0FBSyxRQUFRLFVBQVU7QUFBQSxRQUNqRCxLQUFLLFFBQVEsVUFBVSxNQUFNLE9BQU87QUFBQTtBQUFBLElBRzVDLGlCQUFpQixDQUFDLFNBQVMsVUFBVTtBQUFBLE1BQ2pDLElBQU0sV0FBVyxLQUFLLGtCQUFrQixHQUNsQyxPQUFPLEtBQUssY0FBYyxPQUFPLEdBQ25DLE1BQU0sV0FBVyxLQUFLO0FBQUEsTUFDMUIsSUFBSTtBQUFBLFFBRUEsSUFBSSxLQUFLLFdBQVcsR0FBRztBQUFBLFVBQ25CLE9BQU87QUFBQSxVQUNQLFNBQVcsS0FBSztBQUFBLFlBQ1osT0FBTyxJQUFJO0FBQUEsVUFJZCxTQUFJLFFBQVEsMEJBQTBCO0FBQUEsVUFDdkMsT0FBTyxJQUFJO0FBQUEsVUFDWCxTQUFXLEtBQUs7QUFBQSxZQUNaLE9BQU8sSUFBSTtBQUFBLFVBSWQ7QUFBQSxVQUNELE9BQU8sS0FBSyxvQkFBb0IsUUFBUTtBQUFBLFVBQ3hDLFNBQVcsS0FBSztBQUFBLFlBQ1osT0FBTyxJQUFJLEtBQUssb0JBQW9CLENBQUM7QUFBQTtBQUFBLE1BSTVDO0FBQUEsUUFJRCxPQUFPO0FBQUEsUUFDUCxTQUFXLEtBQUs7QUFBQSxVQUNaLE9BQU8sSUFBSTtBQUFBO0FBQUEsTUFHbkIsT0FBTztBQUFBO0FBQUEsSUFFWCxrQkFBa0IsQ0FBQyxNQUFNLFdBQVcsUUFBUTtBQUFBLE1BQ3hDLElBQUk7QUFBQSxRQUNBLElBQUksSUFBSSxZQUFZLEtBQUssU0FBUyxHQUM5QixJQUFJLEVBQUUsUUFBUSxHQUFHLEdBQUc7QUFBQSxRQUN4QixPQUFPLElBQUksSUFBSTtBQUFBLFVBQ1gsSUFBTSxPQUFPLEVBQUUsVUFBVSxHQUFHLENBQUM7QUFBQSxVQUM3QixPQUFPLElBQUksR0FFWCxJQUFJLEVBQUUsVUFBVSxJQUFJLEdBQUcsSUFBSSxNQUFNLEdBQ2pDLElBQUksRUFBRSxRQUFRLEdBQUcsR0FBRztBQUFBO0FBQUEsUUFFeEIsT0FBTztBQUFBLFFBRVgsT0FBTyxLQUFLO0FBQUEsUUFHUixPQURBLEtBQUssT0FBTyw0Q0FBNEMsS0FBSyxHQUN0RDtBQUFBO0FBQUE7QUFBQSxJQUdmLGlCQUFpQixHQUFHO0FBQUEsTUFDaEIsSUFBSTtBQUFBLFFBQ0EsSUFBSSxLQUFLLFdBQVc7QUFBQSxVQUNoQixPQUFPLFFBQVEsSUFBSSxXQUFjO0FBQUE7QUFBQSxNQUd6QyxPQUFPLEtBQUs7QUFBQTtBQUFBLElBRWhCLGFBQWEsQ0FBQyxTQUFTO0FBQUEsTUFDbkIsSUFBSTtBQUFBLFFBQ0EsSUFBSSxLQUFLLFdBQVcsR0FBRztBQUFBLFVBQ25CLElBQUksVUFBVSxhQUFhLEtBQUssb0JBQW9CLEtBQUssUUFBUTtBQUFBLFVBQ2pFLFNBQVcsS0FBSyxLQUFLO0FBQUEsWUFDakIsV0FBVyxLQUNYLFdBQVcsUUFBUSwyQkFDYixJQUNBLEtBQUssb0JBQW9CLENBQUM7QUFBQSxVQUdwQyxPQURBLFdBQVcsS0FDSixDQUFDLE9BQU87QUFBQTtBQUFBO0FBQUEsTUFHdkIsT0FBTyxLQUFLO0FBQUE7QUFBQSxJQUVoQixTQUFTLENBQUMsS0FBSyxLQUFLO0FBQUEsTUFDaEIsT0FBTyxJQUFJLFNBQVMsR0FBRztBQUFBO0FBQUEsSUFFM0IsVUFBVSxHQUFHO0FBQUEsTUFDVCxJQUFNLGdCQUFnQixLQUFLLFNBQVMsWUFBWTtBQUFBLE1BQ2hELE9BQVEsS0FBSyxVQUFVLGVBQWUsTUFBTSxLQUN4QyxLQUFLLFVBQVUsZUFBZSxNQUFNO0FBQUE7QUFBQSxJQUU1QyxtQkFBbUIsQ0FBQyxLQUFLO0FBQUEsTUFFckIsSUFBSSxDQUFDLEtBQUssV0FBVztBQUFBLFFBQ2pCLE9BQU8sS0FBSyxlQUFlLEdBQUc7QUFBQSxNQVNsQyxJQUFJLENBQUM7QUFBQSxRQUNELE9BQU87QUFBQSxNQUdYLElBQU0sa0JBQWtCO0FBQUEsUUFDcEI7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNKLEdBQ0ksY0FBYztBQUFBLE1BQ2xCLFNBQVcsUUFBUTtBQUFBLFFBQ2YsSUFBSSxnQkFBZ0IsS0FBSyxPQUFLLE1BQU0sSUFBSSxHQUFHO0FBQUEsVUFDdkMsY0FBYztBQUFBLFVBQ2Q7QUFBQTtBQUFBLE1BSVIsSUFBSSxDQUFDO0FBQUEsUUFDRCxPQUFPO0FBQUEsTUFpRFgsSUFBSSxVQUFVLEtBQ1YsV0FBVztBQUFBLE1BQ2YsU0FBUyxJQUFJLElBQUksT0FBUSxJQUFJLEdBQUc7QUFBQSxRQUc1QixJQURBLFdBQVcsSUFBSSxJQUFJLElBQ2YsWUFBWSxJQUFJLElBQUksT0FBTztBQUFBLFVBQzNCLFdBQVc7QUFBQSxRQUVWLFNBQUksSUFBSSxJQUFJLE9BQU87QUFBQSxVQUNwQixXQUFXLElBQ1gsV0FBVztBQUFBLFFBR1g7QUFBQSxxQkFBVztBQUFBLE1BSW5CLE9BREEsV0FBVyxLQUNKLFFBQ0YsTUFBTSxFQUFFLEVBQ1IsUUFBUSxFQUNSLEtBQUssRUFBRTtBQUFBO0FBQUEsSUFFaEIsY0FBYyxDQUFDLEtBQUs7QUFBQSxNQTRCaEIsSUFBSSxDQUFDO0FBQUEsUUFFRCxPQUFPO0FBQUEsTUFFWCxJQUFJLENBQUMsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksU0FBUyxJQUFJLEtBQUssQ0FBQyxJQUFJLFNBQVMsR0FBRztBQUFBLFFBRTlELE9BQU87QUFBQSxNQUVYLElBQUksQ0FBQyxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxTQUFTLElBQUk7QUFBQSxRQUd4QyxPQUFPLElBQUk7QUFBQSxNQWtCZixJQUFJLFVBQVUsS0FDVixXQUFXO0FBQUEsTUFDZixTQUFTLElBQUksSUFBSSxPQUFRLElBQUksR0FBRztBQUFBLFFBRzVCLElBREEsV0FBVyxJQUFJLElBQUksSUFDZixZQUFZLElBQUksSUFBSSxPQUFPO0FBQUEsVUFDM0IsV0FBVztBQUFBLFFBRVYsU0FBSSxJQUFJLElBQUksT0FBTztBQUFBLFVBQ3BCLFdBQVcsSUFDWCxXQUFXO0FBQUEsUUFHWDtBQUFBLHFCQUFXO0FBQUEsTUFJbkIsT0FEQSxXQUFXLEtBQ0osUUFDRixNQUFNLEVBQUUsRUFDUixRQUFRLEVBQ1IsS0FBSyxFQUFFO0FBQUE7QUFBQSxJQUVoQixpQkFBaUIsQ0FBQyxTQUFTO0FBQUEsTUFDdkIsVUFBVSxXQUFXLENBQUM7QUFBQSxNQUN0QixJQUFNLFNBQVM7QUFBQSxRQUNYLEtBQUssUUFBUSxPQUFPLFFBQVEsSUFBSTtBQUFBLFFBQ2hDLEtBQUssUUFBUSxPQUFPLFFBQVE7QUFBQSxRQUM1QixRQUFRLFFBQVEsVUFBVTtBQUFBLFFBQzFCLDBCQUEwQixRQUFRLDRCQUE0QjtBQUFBLFFBQzlELGNBQWMsUUFBUSxnQkFBZ0I7QUFBQSxRQUN0QyxrQkFBa0IsUUFBUSxvQkFBb0I7QUFBQSxRQUM5QyxPQUFPLFFBQVEsU0FBUztBQUFBLE1BQzVCO0FBQUEsTUFHQSxPQUZBLE9BQU8sWUFBWSxRQUFRLGFBQWEsUUFBUSxRQUNoRCxPQUFPLFlBQVksUUFBUSxhQUFhLFFBQVEsUUFDekM7QUFBQTtBQUFBLElBRVgsZ0JBQWdCLENBQUMsU0FBUyxVQUFVO0FBQUEsTUFDaEMsVUFBVSxXQUFXLENBQUM7QUFBQSxNQUN0QixJQUFNLFNBQVMsQ0FBQztBQUFBLE1BS2hCLElBSkEsT0FBTyxNQUFNLFFBQVEsS0FDckIsT0FBTyxNQUFNLFFBQVEsS0FDckIsT0FBTywyQkFDSCxRQUFRLDRCQUE0QixLQUFLLFdBQVcsR0FDcEQsUUFBUTtBQUFBLFFBQ1IsT0FBTyxRQUFRLElBQUk7QUFBQSxNQUV2QixPQUFPO0FBQUE7QUFBQSxJQVdYLElBQUksR0FBRztBQUFBLE1BQ0gsT0FBTyxVQUFVLE1BQVcsUUFBUSxRQUFHLFVBQVUsR0FBRztBQUFBLFFBRWhELElBQUksQ0FBQyxPQUFPLFNBQVMsS0FBSyxRQUFRLE1BQzdCLEtBQUssU0FBUyxTQUFTLEdBQUcsS0FDdEIsY0FBYyxLQUFLLFNBQVMsU0FBUyxJQUFJO0FBQUEsVUFFOUMsS0FBSyxXQUFXLEtBQUssUUFBUSxRQUFRLElBQUksR0FBRyxLQUFLLFFBQVEsT0FBTyxRQUFRLElBQUksR0FBRyxLQUFLLFFBQVE7QUFBQSxRQUtoRyxPQURBLEtBQUssV0FBVyxNQUFNLEdBQUcsTUFBTSxLQUFLLFVBQVUsRUFBSSxHQUMzQyxJQUFJLFFBQVEsQ0FBQyxTQUFTLFdBQVcsVUFBVSxNQUFXLFFBQVEsUUFBRyxVQUFVLEdBQUc7QUFBQSxVQUNqRixLQUFLLE9BQU8sY0FBYyxLQUFLLFVBQVUsR0FDekMsS0FBSyxPQUFPLFlBQVk7QUFBQSxVQUN4QixTQUFXLE9BQU8sS0FBSztBQUFBLFlBQ25CLEtBQUssT0FBTyxNQUFNLEtBQUs7QUFBQSxVQUUzQixJQUFNLGlCQUFpQixLQUFLLGtCQUFrQixLQUFLLE9BQU87QUFBQSxVQUMxRCxJQUFJLENBQUMsZUFBZSxVQUFVLGVBQWU7QUFBQSxZQUN6QyxlQUFlLFVBQVUsTUFBTSxLQUFLLGtCQUFrQixjQUFjLElBQUksR0FBRyxHQUFHO0FBQUEsVUFFbEYsSUFBTSxRQUFRLElBQUksVUFBVSxnQkFBZ0IsS0FBSyxRQUFRO0FBQUEsVUFJekQsSUFIQSxNQUFNLEdBQUcsU0FBUyxDQUFDLFlBQVk7QUFBQSxZQUMzQixLQUFLLE9BQU8sT0FBTztBQUFBLFdBQ3RCLEdBQ0csS0FBSyxRQUFRLE9BQU8sRUFBRSxNQUFNLE9BQU8sT0FBTyxLQUFLLFFBQVEsR0FBRztBQUFBLFlBQzFELE9BQU8sT0FBVyxNQUFNLFlBQVksS0FBSyxRQUFRLHFCQUFxQixDQUFDO0FBQUEsVUFFM0UsSUFBTSxXQUFXLEtBQUssa0JBQWtCLEdBQ2xDLEtBQUssTUFBTSxNQUFNLFVBQVUsS0FBSyxjQUFjLGNBQWMsR0FBRyxLQUFLLGlCQUFpQixLQUFLLFNBQVMsUUFBUSxDQUFDLEdBQzlHLFlBQVk7QUFBQSxVQUNoQixJQUFJLEdBQUc7QUFBQSxZQUNILEdBQUcsT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTO0FBQUEsY0FDM0IsSUFBSSxLQUFLLFFBQVEsYUFBYSxLQUFLLFFBQVEsVUFBVTtBQUFBLGdCQUNqRCxLQUFLLFFBQVEsVUFBVSxPQUFPLElBQUk7QUFBQSxjQUV0QyxJQUFJLENBQUMsZUFBZSxVQUFVLGVBQWU7QUFBQSxnQkFDekMsZUFBZSxVQUFVLE1BQU0sSUFBSTtBQUFBLGNBRXZDLFlBQVksS0FBSyxtQkFBbUIsTUFBTSxXQUFXLENBQUMsU0FBUztBQUFBLGdCQUMzRCxJQUFJLEtBQUssUUFBUSxhQUFhLEtBQUssUUFBUSxVQUFVO0FBQUEsa0JBQ2pELEtBQUssUUFBUSxVQUFVLFFBQVEsSUFBSTtBQUFBLGVBRTFDO0FBQUEsYUFDSjtBQUFBLFVBRUwsSUFBSSxZQUFZO0FBQUEsVUFDaEIsSUFBSSxHQUFHO0FBQUEsWUFDSCxHQUFHLE9BQU8sR0FBRyxRQUFRLENBQUMsU0FBUztBQUFBLGNBRTNCLElBREEsTUFBTSxnQkFBZ0IsSUFDbEIsS0FBSyxRQUFRLGFBQWEsS0FBSyxRQUFRLFVBQVU7QUFBQSxnQkFDakQsS0FBSyxRQUFRLFVBQVUsT0FBTyxJQUFJO0FBQUEsY0FFdEMsSUFBSSxDQUFDLGVBQWUsVUFDaEIsZUFBZSxhQUNmLGVBQWU7QUFBQSxpQkFDTCxlQUFlLGVBQ25CLGVBQWUsWUFDZixlQUFlLFdBQ25CLE1BQU0sSUFBSTtBQUFBLGNBRWhCLFlBQVksS0FBSyxtQkFBbUIsTUFBTSxXQUFXLENBQUMsU0FBUztBQUFBLGdCQUMzRCxJQUFJLEtBQUssUUFBUSxhQUFhLEtBQUssUUFBUSxVQUFVO0FBQUEsa0JBQ2pELEtBQUssUUFBUSxVQUFVLFFBQVEsSUFBSTtBQUFBLGVBRTFDO0FBQUEsYUFDSjtBQUFBLFVBb0NMLElBbENBLEdBQUcsR0FBRyxTQUFTLENBQUMsUUFBUTtBQUFBLFlBQ3BCLE1BQU0sZUFBZSxJQUFJLFNBQ3pCLE1BQU0sZ0JBQWdCLElBQ3RCLE1BQU0sZ0JBQWdCLElBQ3RCLE1BQU0sY0FBYztBQUFBLFdBQ3ZCLEdBQ0QsR0FBRyxHQUFHLFFBQVEsQ0FBQyxTQUFTO0FBQUEsWUFDcEIsTUFBTSxrQkFBa0IsTUFDeEIsTUFBTSxnQkFBZ0IsSUFDdEIsS0FBSyxPQUFPLGFBQWEsNEJBQTRCLEtBQUssV0FBVyxHQUNyRSxNQUFNLGNBQWM7QUFBQSxXQUN2QixHQUNELEdBQUcsR0FBRyxTQUFTLENBQUMsU0FBUztBQUFBLFlBQ3JCLE1BQU0sa0JBQWtCLE1BQ3hCLE1BQU0sZ0JBQWdCLElBQ3RCLE1BQU0sZ0JBQWdCLElBQ3RCLEtBQUssT0FBTyx1Q0FBdUMsS0FBSyxXQUFXLEdBQ25FLE1BQU0sY0FBYztBQUFBLFdBQ3ZCLEdBQ0QsTUFBTSxHQUFHLFFBQVEsQ0FBQyxPQUFPLGFBQWE7QUFBQSxZQUNsQyxJQUFJLFVBQVUsU0FBUztBQUFBLGNBQ25CLEtBQUssS0FBSyxXQUFXLFNBQVM7QUFBQSxZQUVsQyxJQUFJLFVBQVUsU0FBUztBQUFBLGNBQ25CLEtBQUssS0FBSyxXQUFXLFNBQVM7QUFBQSxZQUdsQyxJQURBLEdBQUcsbUJBQW1CLEdBQ2xCO0FBQUEsY0FDQSxPQUFPLEtBQUs7QUFBQSxZQUdaO0FBQUEsc0JBQVEsUUFBUTtBQUFBLFdBRXZCLEdBQ0csS0FBSyxRQUFRLE9BQU87QUFBQSxZQUNwQixJQUFJLENBQUMsR0FBRztBQUFBLGNBQ0osTUFBVSxNQUFNLDZCQUE2QjtBQUFBLFlBRWpELEdBQUcsTUFBTSxJQUFJLEtBQUssUUFBUSxLQUFLO0FBQUE7QUFBQSxTQUV0QyxDQUFDO0FBQUEsT0FDTDtBQUFBO0FBQUEsRUFFVDtBQUFBLEVBQ0EsUUFBUSxhQUFhO0FBQUEsRUFPckIsU0FBUyxnQkFBZ0IsQ0FBQyxXQUFXO0FBQUEsSUFDakMsSUFBTSxPQUFPLENBQUMsR0FDVixXQUFXLElBQ1gsVUFBVSxJQUNWLE1BQU07QUFBQSxJQUNWLFNBQVMsTUFBTSxDQUFDLEdBQUc7QUFBQSxNQUVmLElBQUksV0FBVyxNQUFNO0FBQUEsUUFDakIsT0FBTztBQUFBLE1BRVgsT0FBTyxHQUNQLFVBQVU7QUFBQTtBQUFBLElBRWQsU0FBUyxJQUFJLEVBQUcsSUFBSSxVQUFVLFFBQVEsS0FBSztBQUFBLE1BQ3ZDLElBQU0sSUFBSSxVQUFVLE9BQU8sQ0FBQztBQUFBLE1BQzVCLElBQUksTUFBTSxLQUFLO0FBQUEsUUFDWCxJQUFJLENBQUM7QUFBQSxVQUNELFdBQVcsQ0FBQztBQUFBLFFBR1o7QUFBQSxpQkFBTyxDQUFDO0FBQUEsUUFFWjtBQUFBO0FBQUEsTUFFSixJQUFJLE1BQU0sUUFBUSxTQUFTO0FBQUEsUUFDdkIsT0FBTyxDQUFDO0FBQUEsUUFDUjtBQUFBO0FBQUEsTUFFSixJQUFJLE1BQU0sUUFBUSxVQUFVO0FBQUEsUUFDeEIsVUFBVTtBQUFBLFFBQ1Y7QUFBQTtBQUFBLE1BRUosSUFBSSxNQUFNLE9BQU8sQ0FBQyxVQUFVO0FBQUEsUUFDeEIsSUFBSSxJQUFJLFNBQVM7QUFBQSxVQUNiLEtBQUssS0FBSyxHQUFHLEdBQ2IsTUFBTTtBQUFBLFFBRVY7QUFBQTtBQUFBLE1BRUosT0FBTyxDQUFDO0FBQUE7QUFBQSxJQUVaLElBQUksSUFBSSxTQUFTO0FBQUEsTUFDYixLQUFLLEtBQUssSUFBSSxLQUFLLENBQUM7QUFBQSxJQUV4QixPQUFPO0FBQUE7QUFBQSxFQUVYLFFBQVEsbUJBQW1CO0FBQUE7QUFBQSxFQUMzQixNQUFNLGtCQUFrQixPQUFPLGFBQWE7QUFBQSxJQUN4QyxXQUFXLENBQUMsU0FBUyxVQUFVO0FBQUEsTUFDM0IsTUFBTTtBQUFBLE1BU04sSUFSQSxLQUFLLGdCQUFnQixJQUNyQixLQUFLLGVBQWUsSUFDcEIsS0FBSyxrQkFBa0IsR0FDdkIsS0FBSyxnQkFBZ0IsSUFDckIsS0FBSyxnQkFBZ0IsSUFDckIsS0FBSyxRQUFRLEtBQ2IsS0FBSyxPQUFPLElBQ1osS0FBSyxVQUFVLE1BQ1gsQ0FBQztBQUFBLFFBQ0QsTUFBVSxNQUFNLDRCQUE0QjtBQUFBLE1BSWhELElBRkEsS0FBSyxVQUFVLFNBQ2YsS0FBSyxXQUFXLFVBQ1osUUFBUTtBQUFBLFFBQ1IsS0FBSyxRQUFRLFFBQVE7QUFBQTtBQUFBLElBRzdCLGFBQWEsR0FBRztBQUFBLE1BQ1osSUFBSSxLQUFLO0FBQUEsUUFDTDtBQUFBLE1BRUosSUFBSSxLQUFLO0FBQUEsUUFDTCxLQUFLLFdBQVc7QUFBQSxNQUVmLFNBQUksS0FBSztBQUFBLFFBQ1YsS0FBSyxVQUFVLFNBQVMsV0FBVyxVQUFVLGVBQWUsS0FBSyxPQUFPLElBQUk7QUFBQTtBQUFBLElBR3BGLE1BQU0sQ0FBQyxTQUFTO0FBQUEsTUFDWixLQUFLLEtBQUssU0FBUyxPQUFPO0FBQUE7QUFBQSxJQUU5QixVQUFVLEdBQUc7QUFBQSxNQUVULElBQUk7QUFBQSxNQUNKLElBQUksS0FBSztBQUFBLFFBQ0wsSUFBSSxLQUFLO0FBQUEsVUFDTCxRQUFZLE1BQU0sOERBQThELEtBQUssb0VBQW9FLEtBQUssY0FBYztBQUFBLFFBRTNLLFNBQUksS0FBSyxvQkFBb0IsS0FBSyxDQUFDLEtBQUssUUFBUTtBQUFBLFVBQ2pELFFBQVksTUFBTSxnQkFBZ0IsS0FBSyxtQ0FBbUMsS0FBSyxpQkFBaUI7QUFBQSxRQUUvRixTQUFJLEtBQUssaUJBQWlCLEtBQUssUUFBUTtBQUFBLFVBQ3hDLFFBQVksTUFBTSxnQkFBZ0IsS0FBSyw4RUFBOEU7QUFBQTtBQUFBLE1BSTdILElBQUksS0FBSztBQUFBLFFBQ0wsYUFBYSxLQUFLLE9BQU8sR0FDekIsS0FBSyxVQUFVO0FBQUEsTUFFbkIsS0FBSyxPQUFPLElBQ1osS0FBSyxLQUFLLFFBQVEsT0FBTyxLQUFLLGVBQWU7QUFBQTtBQUFBLFdBRTFDLGFBQWEsQ0FBQyxPQUFPO0FBQUEsTUFDeEIsSUFBSSxNQUFNO0FBQUEsUUFDTjtBQUFBLE1BRUosSUFBSSxDQUFDLE1BQU0saUJBQWlCLE1BQU0sZUFBZTtBQUFBLFFBQzdDLElBQU0sVUFBVSwwQ0FBMEMsTUFBTSxRQUM1RCxnREFBZ0QsTUFBTTtBQUFBLFFBQzFELE1BQU0sT0FBTyxPQUFPO0FBQUE7QUFBQSxNQUV4QixNQUFNLFdBQVc7QUFBQTtBQUFBLEVBRXpCO0FBQUE7Ozs7RUN2bUJBLElBQUksa0JBQW1CLFdBQVEsUUFBSyxvQkFBcUIsT0FBTyxTQUFVLFFBQVEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJO0FBQUEsSUFDNUYsSUFBSSxPQUFPO0FBQUEsTUFBVyxLQUFLO0FBQUEsSUFDM0IsT0FBTyxlQUFlLEdBQUcsSUFBSSxFQUFFLFlBQVksSUFBTSxLQUFLLFFBQVEsR0FBRztBQUFBLE1BQUUsT0FBTyxFQUFFO0FBQUEsTUFBTSxDQUFDO0FBQUEsTUFDakYsUUFBUSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUk7QUFBQSxJQUN4QixJQUFJLE9BQU87QUFBQSxNQUFXLEtBQUs7QUFBQSxJQUMzQixFQUFFLE1BQU0sRUFBRTtBQUFBLE1BRVYscUJBQXNCLFdBQVEsUUFBSyx1QkFBd0IsT0FBTyxTQUFVLFFBQVEsQ0FBQyxHQUFHLEdBQUc7QUFBQSxJQUMzRixPQUFPLGVBQWUsR0FBRyxXQUFXLEVBQUUsWUFBWSxJQUFNLE9BQU8sRUFBRSxDQUFDO0FBQUEsTUFDakUsUUFBUSxDQUFDLEdBQUcsR0FBRztBQUFBLElBQ2hCLEVBQUUsVUFBYTtBQUFBLE1BRWYsZUFBZ0IsV0FBUSxRQUFLLGdCQUFpQixRQUFTLENBQUMsS0FBSztBQUFBLElBQzdELElBQUksT0FBTyxJQUFJO0FBQUEsTUFBWSxPQUFPO0FBQUEsSUFDbEMsSUFBSSxTQUFTLENBQUM7QUFBQSxJQUNkLElBQUksT0FBTztBQUFBLE1BQU0sU0FBUyxLQUFLO0FBQUEsUUFBSyxJQUFJLE1BQU0sYUFBYSxPQUFPLGVBQWUsS0FBSyxLQUFLLENBQUM7QUFBQSxVQUFHLGdCQUFnQixRQUFRLEtBQUssQ0FBQztBQUFBO0FBQUEsSUFFN0gsT0FEQSxtQkFBbUIsUUFBUSxHQUFHLEdBQ3ZCO0FBQUEsS0FFUCxZQUFhLFdBQVEsUUFBSyxhQUFjLFFBQVMsQ0FBQyxTQUFTLFlBQVksR0FBRyxXQUFXO0FBQUEsSUFDckYsU0FBUyxLQUFLLENBQUMsT0FBTztBQUFBLE1BQUUsT0FBTyxpQkFBaUIsSUFBSSxRQUFRLElBQUksRUFBRSxRQUFTLENBQUMsU0FBUztBQUFBLFFBQUUsUUFBUSxLQUFLO0FBQUEsT0FBSTtBQUFBO0FBQUEsSUFDeEcsT0FBTyxLQUFLLE1BQU0sSUFBSSxVQUFVLFFBQVMsQ0FBQyxTQUFTLFFBQVE7QUFBQSxNQUN2RCxTQUFTLFNBQVMsQ0FBQyxPQUFPO0FBQUEsUUFBRSxJQUFJO0FBQUEsVUFBRSxLQUFLLFVBQVUsS0FBSyxLQUFLLENBQUM7QUFBQSxVQUFLLE9BQU8sR0FBRztBQUFBLFVBQUUsT0FBTyxDQUFDO0FBQUE7QUFBQTtBQUFBLE1BQ3JGLFNBQVMsUUFBUSxDQUFDLE9BQU87QUFBQSxRQUFFLElBQUk7QUFBQSxVQUFFLEtBQUssVUFBVSxNQUFTLEtBQUssQ0FBQztBQUFBLFVBQUssT0FBTyxHQUFHO0FBQUEsVUFBRSxPQUFPLENBQUM7QUFBQTtBQUFBO0FBQUEsTUFDeEYsU0FBUyxJQUFJLENBQUMsUUFBUTtBQUFBLFFBQUUsT0FBTyxPQUFPLFFBQVEsT0FBTyxLQUFLLElBQUksTUFBTSxPQUFPLEtBQUssRUFBRSxLQUFLLFdBQVcsUUFBUTtBQUFBO0FBQUEsTUFDMUcsTUFBTSxZQUFZLFVBQVUsTUFBTSxTQUFTLGNBQWMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO0FBQUEsS0FDdkU7QUFBQTtBQUFBLEVBRUwsT0FBTyxlQUFlLFNBQVMsY0FBYyxFQUFFLE9BQU8sR0FBSyxDQUFDO0FBQUEsRUFDNUQsUUFBUSxnQkFBZ0IsUUFBUSxPQUFZO0FBQUEsRUFDNUMsSUFBTSxnREFDQSxLQUFLLGlDQUFvQztBQUFBLEVBVy9DLFNBQVMsSUFBSSxDQUFDLGFBQWEsTUFBTSxTQUFTO0FBQUEsSUFDdEMsT0FBTyxVQUFVLE1BQVcsUUFBUSxRQUFHLFVBQVUsR0FBRztBQUFBLE1BQ2hELElBQU0sY0FBYyxHQUFHLGlCQUFpQixXQUFXO0FBQUEsTUFDbkQsSUFBSSxZQUFZLFdBQVc7QUFBQSxRQUN2QixNQUFVLE1BQU0sa0RBQWtEO0FBQUEsTUFHdEUsSUFBTSxXQUFXLFlBQVk7QUFBQSxNQUc3QixPQUZBLE9BQU8sWUFBWSxNQUFNLENBQUMsRUFBRSxPQUFPLFFBQVEsQ0FBQyxDQUFDLEdBQzlCLElBQUksR0FBRyxXQUFXLFVBQVUsTUFBTSxPQUFPLEVBQzFDLEtBQUs7QUFBQSxLQUN0QjtBQUFBO0FBQUEsRUFFTCxRQUFRLE9BQU87QUFBQSxFQVdmLFNBQVMsYUFBYSxDQUFDLGFBQWEsTUFBTSxTQUFTO0FBQUEsSUFDL0MsSUFBSSxJQUFJO0FBQUEsSUFDUixPQUFPLFVBQVUsTUFBVyxRQUFRLFFBQUcsVUFBVSxHQUFHO0FBQUEsTUFDaEQsSUFBSSxTQUFTLElBQ1QsU0FBUyxJQUVQLGdCQUFnQixJQUFJLGlCQUFpQixjQUFjLE1BQU0sR0FDekQsZ0JBQWdCLElBQUksaUJBQWlCLGNBQWMsTUFBTSxHQUN6RCwwQkFBMEIsS0FBSyxZQUFZLFFBQVEsWUFBaUIsU0FBUyxTQUFJLFFBQVEsZUFBZSxRQUFRLE9BQVksU0FBUyxTQUFJLEdBQUcsUUFDNUksMEJBQTBCLEtBQUssWUFBWSxRQUFRLFlBQWlCLFNBQVMsU0FBSSxRQUFRLGVBQWUsUUFBUSxPQUFZLFNBQVMsU0FBSSxHQUFHLFFBQzVJLGlCQUFpQixDQUFDLFNBQVM7QUFBQSxRQUU3QixJQURBLFVBQVUsY0FBYyxNQUFNLElBQUksR0FDOUI7QUFBQSxVQUNBLHVCQUF1QixJQUFJO0FBQUEsU0FHN0IsaUJBQWlCLENBQUMsU0FBUztBQUFBLFFBRTdCLElBREEsVUFBVSxjQUFjLE1BQU0sSUFBSSxHQUM5QjtBQUFBLFVBQ0EsdUJBQXVCLElBQUk7QUFBQSxTQUc3QixZQUFZLE9BQU8sT0FBTyxPQUFPLE9BQU8sQ0FBQyxHQUFHLFlBQVksUUFBUSxZQUFpQixTQUFTLFNBQUksUUFBUSxTQUFTLEdBQUcsRUFBRSxRQUFRLGdCQUFnQixRQUFRLGVBQWUsQ0FBQyxHQUNwSyxXQUFXLE1BQU0sS0FBSyxhQUFhLE1BQU0sT0FBTyxPQUFPLE9BQU8sT0FBTyxDQUFDLEdBQUcsT0FBTyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFBQSxNQUl2RyxPQUZBLFVBQVUsY0FBYyxJQUFJLEdBQzVCLFVBQVUsY0FBYyxJQUFJLEdBQ3JCO0FBQUEsUUFDSDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDSjtBQUFBLEtBQ0g7QUFBQTtBQUFBLEVBRUwsUUFBUSxnQkFBZ0I7QUFBQTsiLAogICJkZWJ1Z0lkIjogIjIxMjI5MDcyQTkxREU1Mjk2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
