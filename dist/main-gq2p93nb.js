import {
  require_lib
} from "./main-zqznhazw.js";
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

// node_modules/@actions/core/lib/utils.js
var require_utils = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.toCommandProperties = exports.toCommandValue = void 0;
  function toCommandValue(input) {
    if (input === null || input === void 0)
      return "";
    else if (typeof input === "string" || input instanceof String)
      return input;
    return JSON.stringify(input);
  }
  exports.toCommandValue = toCommandValue;
  function toCommandProperties(annotationProperties) {
    if (!Object.keys(annotationProperties).length)
      return {};
    return {
      title: annotationProperties.title,
      file: annotationProperties.file,
      line: annotationProperties.startLine,
      endLine: annotationProperties.endLine,
      col: annotationProperties.startColumn,
      endColumn: annotationProperties.endColumn
    };
  }
  exports.toCommandProperties = toCommandProperties;
});

// node_modules/@actions/core/lib/command.js
var require_command = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
      desc = { enumerable: !0, get: function() {
        return m[k];
      } };
    Object.defineProperty(o, k2, desc);
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
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.issue = exports.issueCommand = void 0;
  var os = __importStar(__require("os")), utils_1 = require_utils();
  function issueCommand(command, properties, message) {
    let cmd = new Command(command, properties, message);
    process.stdout.write(cmd.toString() + os.EOL);
  }
  exports.issueCommand = issueCommand;
  function issue(name, message = "") {
    issueCommand(name, {}, message);
  }
  exports.issue = issue;
  var CMD_STRING = "::";

  class Command {
    constructor(command, properties, message) {
      if (!command)
        command = "missing.command";
      this.command = command, this.properties = properties, this.message = message;
    }
    toString() {
      let cmdStr = CMD_STRING + this.command;
      if (this.properties && Object.keys(this.properties).length > 0) {
        cmdStr += " ";
        let first = !0;
        for (let key in this.properties)
          if (this.properties.hasOwnProperty(key)) {
            let val = this.properties[key];
            if (val) {
              if (first)
                first = !1;
              else
                cmdStr += ",";
              cmdStr += `${key}=${escapeProperty(val)}`;
            }
          }
      }
      return cmdStr += `${CMD_STRING}${escapeData(this.message)}`, cmdStr;
    }
  }
  function escapeData(s) {
    return (0, utils_1.toCommandValue)(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  }
  function escapeProperty(s) {
    return (0, utils_1.toCommandValue)(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/:/g, "%3A").replace(/,/g, "%2C");
  }
});

// node_modules/@actions/core/lib/file-command.js
var require_file_command = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
      desc = { enumerable: !0, get: function() {
        return m[k];
      } };
    Object.defineProperty(o, k2, desc);
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
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.prepareKeyValueMessage = exports.issueFileCommand = void 0;
  var crypto = __importStar(__require("crypto")), fs = __importStar(__require("fs")), os = __importStar(__require("os")), utils_1 = require_utils();
  function issueFileCommand(command, message) {
    let filePath = process.env[`GITHUB_${command}`];
    if (!filePath)
      throw Error(`Unable to find environment variable for file command ${command}`);
    if (!fs.existsSync(filePath))
      throw Error(`Missing file at path: ${filePath}`);
    fs.appendFileSync(filePath, `${(0, utils_1.toCommandValue)(message)}${os.EOL}`, {
      encoding: "utf8"
    });
  }
  exports.issueFileCommand = issueFileCommand;
  function prepareKeyValueMessage(key, value) {
    let delimiter = `ghadelimiter_${crypto.randomUUID()}`, convertedValue = (0, utils_1.toCommandValue)(value);
    if (key.includes(delimiter))
      throw Error(`Unexpected input: name should not contain the delimiter "${delimiter}"`);
    if (convertedValue.includes(delimiter))
      throw Error(`Unexpected input: value should not contain the delimiter "${delimiter}"`);
    return `${key}<<${delimiter}${os.EOL}${convertedValue}${os.EOL}${delimiter}`;
  }
  exports.prepareKeyValueMessage = prepareKeyValueMessage;
});

// node_modules/@actions/http-client/lib/auth.js
var require_auth = __commonJS((exports) => {
  var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
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
  exports.PersonalAccessTokenCredentialHandler = exports.BearerCredentialHandler = exports.BasicCredentialHandler = void 0;

  class BasicCredentialHandler {
    constructor(username, password) {
      this.username = username, this.password = password;
    }
    prepareRequest(options) {
      if (!options.headers)
        throw Error("The request has no headers");
      options.headers.Authorization = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`;
    }
    canHandleAuthentication() {
      return !1;
    }
    handleAuthentication() {
      return __awaiter(this, void 0, void 0, function* () {
        throw Error("not implemented");
      });
    }
  }
  exports.BasicCredentialHandler = BasicCredentialHandler;

  class BearerCredentialHandler {
    constructor(token) {
      this.token = token;
    }
    prepareRequest(options) {
      if (!options.headers)
        throw Error("The request has no headers");
      options.headers.Authorization = `Bearer ${this.token}`;
    }
    canHandleAuthentication() {
      return !1;
    }
    handleAuthentication() {
      return __awaiter(this, void 0, void 0, function* () {
        throw Error("not implemented");
      });
    }
  }
  exports.BearerCredentialHandler = BearerCredentialHandler;

  class PersonalAccessTokenCredentialHandler {
    constructor(token) {
      this.token = token;
    }
    prepareRequest(options) {
      if (!options.headers)
        throw Error("The request has no headers");
      options.headers.Authorization = `Basic ${Buffer.from(`PAT:${this.token}`).toString("base64")}`;
    }
    canHandleAuthentication() {
      return !1;
    }
    handleAuthentication() {
      return __awaiter(this, void 0, void 0, function* () {
        throw Error("not implemented");
      });
    }
  }
  exports.PersonalAccessTokenCredentialHandler = PersonalAccessTokenCredentialHandler;
});

// node_modules/@actions/core/lib/oidc-utils.js
var require_oidc_utils = __commonJS((exports) => {
  var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
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
  exports.OidcClient = void 0;
  var http_client_1 = require_lib(), auth_1 = require_auth(), core_1 = require_core();

  class OidcClient {
    static createHttpClient(allowRetry = !0, maxRetry = 10) {
      let requestOptions = {
        allowRetries: allowRetry,
        maxRetries: maxRetry
      };
      return new http_client_1.HttpClient("actions/oidc-client", [new auth_1.BearerCredentialHandler(OidcClient.getRequestToken())], requestOptions);
    }
    static getRequestToken() {
      let token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
      if (!token)
        throw Error("Unable to get ACTIONS_ID_TOKEN_REQUEST_TOKEN env variable");
      return token;
    }
    static getIDTokenUrl() {
      let runtimeUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
      if (!runtimeUrl)
        throw Error("Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable");
      return runtimeUrl;
    }
    static getCall(id_token_url) {
      var _a;
      return __awaiter(this, void 0, void 0, function* () {
        let id_token = (_a = (yield OidcClient.createHttpClient().getJson(id_token_url).catch((error) => {
          throw Error(`Failed to get ID Token. 
 
        Error Code : ${error.statusCode}
 
        Error Message: ${error.message}`);
        })).result) === null || _a === void 0 ? void 0 : _a.value;
        if (!id_token)
          throw Error("Response json body do not have ID Token field");
        return id_token;
      });
    }
    static getIDToken(audience) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          let id_token_url = OidcClient.getIDTokenUrl();
          if (audience) {
            let encodedAudience = encodeURIComponent(audience);
            id_token_url = `${id_token_url}&audience=${encodedAudience}`;
          }
          (0, core_1.debug)(`ID token url is ${id_token_url}`);
          let id_token = yield OidcClient.getCall(id_token_url);
          return (0, core_1.setSecret)(id_token), id_token;
        } catch (error) {
          throw Error(`Error message: ${error.message}`);
        }
      });
    }
  }
  exports.OidcClient = OidcClient;
});

// node_modules/@actions/core/lib/summary.js
var require_summary = __commonJS((exports) => {
  var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
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
  exports.summary = exports.markdownSummary = exports.SUMMARY_DOCS_URL = exports.SUMMARY_ENV_VAR = void 0;
  var os_1 = __require("os"), fs_1 = __require("fs"), { access, appendFile, writeFile } = fs_1.promises;
  exports.SUMMARY_ENV_VAR = "GITHUB_STEP_SUMMARY";
  exports.SUMMARY_DOCS_URL = "https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary";

  class Summary {
    constructor() {
      this._buffer = "";
    }
    filePath() {
      return __awaiter(this, void 0, void 0, function* () {
        if (this._filePath)
          return this._filePath;
        let pathFromEnv = process.env[exports.SUMMARY_ENV_VAR];
        if (!pathFromEnv)
          throw Error(`Unable to find environment variable for $${exports.SUMMARY_ENV_VAR}. Check if your runtime environment supports job summaries.`);
        try {
          yield access(pathFromEnv, fs_1.constants.R_OK | fs_1.constants.W_OK);
        } catch (_a) {
          throw Error(`Unable to access summary file: '${pathFromEnv}'. Check if the file has correct read/write permissions.`);
        }
        return this._filePath = pathFromEnv, this._filePath;
      });
    }
    wrap(tag, content, attrs = {}) {
      let htmlAttrs = Object.entries(attrs).map(([key, value]) => ` ${key}="${value}"`).join("");
      if (!content)
        return `<${tag}${htmlAttrs}>`;
      return `<${tag}${htmlAttrs}>${content}</${tag}>`;
    }
    write(options) {
      return __awaiter(this, void 0, void 0, function* () {
        let overwrite = !!(options === null || options === void 0 ? void 0 : options.overwrite), filePath = yield this.filePath();
        return yield (overwrite ? writeFile : appendFile)(filePath, this._buffer, { encoding: "utf8" }), this.emptyBuffer();
      });
    }
    clear() {
      return __awaiter(this, void 0, void 0, function* () {
        return this.emptyBuffer().write({ overwrite: !0 });
      });
    }
    stringify() {
      return this._buffer;
    }
    isEmptyBuffer() {
      return this._buffer.length === 0;
    }
    emptyBuffer() {
      return this._buffer = "", this;
    }
    addRaw(text, addEOL = !1) {
      return this._buffer += text, addEOL ? this.addEOL() : this;
    }
    addEOL() {
      return this.addRaw(os_1.EOL);
    }
    addCodeBlock(code, lang) {
      let attrs = Object.assign({}, lang && { lang }), element = this.wrap("pre", this.wrap("code", code), attrs);
      return this.addRaw(element).addEOL();
    }
    addList(items, ordered = !1) {
      let tag = ordered ? "ol" : "ul", listItems = items.map((item) => this.wrap("li", item)).join(""), element = this.wrap(tag, listItems);
      return this.addRaw(element).addEOL();
    }
    addTable(rows) {
      let tableBody = rows.map((row) => {
        let cells = row.map((cell) => {
          if (typeof cell === "string")
            return this.wrap("td", cell);
          let { header, data, colspan, rowspan } = cell, tag = header ? "th" : "td", attrs = Object.assign(Object.assign({}, colspan && { colspan }), rowspan && { rowspan });
          return this.wrap(tag, data, attrs);
        }).join("");
        return this.wrap("tr", cells);
      }).join(""), element = this.wrap("table", tableBody);
      return this.addRaw(element).addEOL();
    }
    addDetails(label, content) {
      let element = this.wrap("details", this.wrap("summary", label) + content);
      return this.addRaw(element).addEOL();
    }
    addImage(src, alt, options) {
      let { width, height } = options || {}, attrs = Object.assign(Object.assign({}, width && { width }), height && { height }), element = this.wrap("img", null, Object.assign({ src, alt }, attrs));
      return this.addRaw(element).addEOL();
    }
    addHeading(text, level) {
      let tag = `h${level}`, allowedTag = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag) ? tag : "h1", element = this.wrap(allowedTag, text);
      return this.addRaw(element).addEOL();
    }
    addSeparator() {
      let element = this.wrap("hr", null);
      return this.addRaw(element).addEOL();
    }
    addBreak() {
      let element = this.wrap("br", null);
      return this.addRaw(element).addEOL();
    }
    addQuote(text, cite) {
      let attrs = Object.assign({}, cite && { cite }), element = this.wrap("blockquote", text, attrs);
      return this.addRaw(element).addEOL();
    }
    addLink(text, href) {
      let element = this.wrap("a", text, { href });
      return this.addRaw(element).addEOL();
    }
  }
  var _summary = new Summary;
  exports.markdownSummary = _summary;
  exports.summary = _summary;
});

// node_modules/@actions/core/lib/path-utils.js
var require_path_utils = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
      desc = { enumerable: !0, get: function() {
        return m[k];
      } };
    Object.defineProperty(o, k2, desc);
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
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.toPlatformPath = exports.toWin32Path = exports.toPosixPath = void 0;
  var path = __importStar(__require("path"));
  function toPosixPath(pth) {
    return pth.replace(/[\\]/g, "/");
  }
  exports.toPosixPath = toPosixPath;
  function toWin32Path(pth) {
    return pth.replace(/[/]/g, "\\");
  }
  exports.toWin32Path = toWin32Path;
  function toPlatformPath(pth) {
    return pth.replace(/[/\\]/g, path.sep);
  }
  exports.toPlatformPath = toPlatformPath;
});

// node_modules/@actions/core/lib/platform.js
var require_platform = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
      desc = { enumerable: !0, get: function() {
        return m[k];
      } };
    Object.defineProperty(o, k2, desc);
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
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
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
  }, __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.getDetails = exports.isLinux = exports.isMacOS = exports.isWindows = exports.arch = exports.platform = void 0;
  var os_1 = __importDefault(__require("os")), exec = __importStar(require_exec()), getWindowsInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    let { stdout: version } = yield exec.getExecOutput('powershell -command "(Get-CimInstance -ClassName Win32_OperatingSystem).Version"', void 0, {
      silent: !0
    }), { stdout: name } = yield exec.getExecOutput('powershell -command "(Get-CimInstance -ClassName Win32_OperatingSystem).Caption"', void 0, {
      silent: !0
    });
    return {
      name: name.trim(),
      version: version.trim()
    };
  }), getMacOsInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    let { stdout } = yield exec.getExecOutput("sw_vers", void 0, {
      silent: !0
    }), version = (_b = (_a = stdout.match(/ProductVersion:\s*(.+)/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : "";
    return {
      name: (_d = (_c = stdout.match(/ProductName:\s*(.+)/)) === null || _c === void 0 ? void 0 : _c[1]) !== null && _d !== void 0 ? _d : "",
      version
    };
  }), getLinuxInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    let { stdout } = yield exec.getExecOutput("lsb_release", ["-i", "-r", "-s"], {
      silent: !0
    }), [name, version] = stdout.trim().split(`
`);
    return {
      name,
      version
    };
  });
  exports.platform = os_1.default.platform();
  exports.arch = os_1.default.arch();
  exports.isWindows = exports.platform === "win32";
  exports.isMacOS = exports.platform === "darwin";
  exports.isLinux = exports.platform === "linux";
  function getDetails() {
    return __awaiter(this, void 0, void 0, function* () {
      return Object.assign(Object.assign({}, yield exports.isWindows ? getWindowsInfo() : exports.isMacOS ? getMacOsInfo() : getLinuxInfo()), {
        platform: exports.platform,
        arch: exports.arch,
        isWindows: exports.isWindows,
        isMacOS: exports.isMacOS,
        isLinux: exports.isLinux
      });
    });
  }
  exports.getDetails = getDetails;
});

// node_modules/@actions/core/lib/core.js
var require_core = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
      desc = { enumerable: !0, get: function() {
        return m[k];
      } };
    Object.defineProperty(o, k2, desc);
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
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
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
  exports.platform = exports.toPlatformPath = exports.toWin32Path = exports.toPosixPath = exports.markdownSummary = exports.summary = exports.getIDToken = exports.getState = exports.saveState = exports.group = exports.endGroup = exports.startGroup = exports.info = exports.notice = exports.warning = exports.error = exports.debug = exports.isDebug = exports.setFailed = exports.setCommandEcho = exports.setOutput = exports.getBooleanInput = exports.getMultilineInput = exports.getInput = exports.addPath = exports.setSecret = exports.exportVariable = exports.ExitCode = void 0;
  var command_1 = require_command(), file_command_1 = require_file_command(), utils_1 = require_utils(), os = __importStar(__require("os")), path = __importStar(__require("path")), oidc_utils_1 = require_oidc_utils(), ExitCode;
  (function(ExitCode2) {
    ExitCode2[ExitCode2.Success = 0] = "Success", ExitCode2[ExitCode2.Failure = 1] = "Failure";
  })(ExitCode || (exports.ExitCode = ExitCode = {}));
  function exportVariable(name, val) {
    let convertedVal = (0, utils_1.toCommandValue)(val);
    if (process.env[name] = convertedVal, process.env.GITHUB_ENV || "")
      return (0, file_command_1.issueFileCommand)("ENV", (0, file_command_1.prepareKeyValueMessage)(name, val));
    (0, command_1.issueCommand)("set-env", { name }, convertedVal);
  }
  exports.exportVariable = exportVariable;
  function setSecret(secret) {
    (0, command_1.issueCommand)("add-mask", {}, secret);
  }
  exports.setSecret = setSecret;
  function addPath(inputPath) {
    if (process.env.GITHUB_PATH || "")
      (0, file_command_1.issueFileCommand)("PATH", inputPath);
    else
      (0, command_1.issueCommand)("add-path", {}, inputPath);
    process.env.PATH = `${inputPath}${path.delimiter}${process.env.PATH}`;
  }
  exports.addPath = addPath;
  function getInput(name, options) {
    let val = process.env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] || "";
    if (options && options.required && !val)
      throw Error(`Input required and not supplied: ${name}`);
    if (options && options.trimWhitespace === !1)
      return val;
    return val.trim();
  }
  exports.getInput = getInput;
  function getMultilineInput(name, options) {
    let inputs = getInput(name, options).split(`
`).filter((x) => x !== "");
    if (options && options.trimWhitespace === !1)
      return inputs;
    return inputs.map((input) => input.trim());
  }
  exports.getMultilineInput = getMultilineInput;
  function getBooleanInput(name, options) {
    let trueValue = ["true", "True", "TRUE"], falseValue = ["false", "False", "FALSE"], val = getInput(name, options);
    if (trueValue.includes(val))
      return !0;
    if (falseValue.includes(val))
      return !1;
    throw TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}
Support boolean input list: \`true | True | TRUE | false | False | FALSE\``);
  }
  exports.getBooleanInput = getBooleanInput;
  function setOutput(name, value) {
    if (process.env.GITHUB_OUTPUT || "")
      return (0, file_command_1.issueFileCommand)("OUTPUT", (0, file_command_1.prepareKeyValueMessage)(name, value));
    process.stdout.write(os.EOL), (0, command_1.issueCommand)("set-output", { name }, (0, utils_1.toCommandValue)(value));
  }
  exports.setOutput = setOutput;
  function setCommandEcho(enabled) {
    (0, command_1.issue)("echo", enabled ? "on" : "off");
  }
  exports.setCommandEcho = setCommandEcho;
  function setFailed(message) {
    process.exitCode = ExitCode.Failure, error(message);
  }
  exports.setFailed = setFailed;
  function isDebug() {
    return process.env.RUNNER_DEBUG === "1";
  }
  exports.isDebug = isDebug;
  function debug(message) {
    (0, command_1.issueCommand)("debug", {}, message);
  }
  exports.debug = debug;
  function error(message, properties = {}) {
    (0, command_1.issueCommand)("error", (0, utils_1.toCommandProperties)(properties), message instanceof Error ? message.toString() : message);
  }
  exports.error = error;
  function warning(message, properties = {}) {
    (0, command_1.issueCommand)("warning", (0, utils_1.toCommandProperties)(properties), message instanceof Error ? message.toString() : message);
  }
  exports.warning = warning;
  function notice(message, properties = {}) {
    (0, command_1.issueCommand)("notice", (0, utils_1.toCommandProperties)(properties), message instanceof Error ? message.toString() : message);
  }
  exports.notice = notice;
  function info(message) {
    process.stdout.write(message + os.EOL);
  }
  exports.info = info;
  function startGroup(name) {
    (0, command_1.issue)("group", name);
  }
  exports.startGroup = startGroup;
  function endGroup() {
    (0, command_1.issue)("endgroup");
  }
  exports.endGroup = endGroup;
  function group(name, fn) {
    return __awaiter(this, void 0, void 0, function* () {
      startGroup(name);
      let result;
      try {
        result = yield fn();
      } finally {
        endGroup();
      }
      return result;
    });
  }
  exports.group = group;
  function saveState(name, value) {
    if (process.env.GITHUB_STATE || "")
      return (0, file_command_1.issueFileCommand)("STATE", (0, file_command_1.prepareKeyValueMessage)(name, value));
    (0, command_1.issueCommand)("save-state", { name }, (0, utils_1.toCommandValue)(value));
  }
  exports.saveState = saveState;
  function getState(name) {
    return process.env[`STATE_${name}`] || "";
  }
  exports.getState = getState;
  function getIDToken(aud) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield oidc_utils_1.OidcClient.getIDToken(aud);
    });
  }
  exports.getIDToken = getIDToken;
  var summary_1 = require_summary();
  Object.defineProperty(exports, "summary", { enumerable: !0, get: function() {
    return summary_1.summary;
  } });
  var summary_2 = require_summary();
  Object.defineProperty(exports, "markdownSummary", { enumerable: !0, get: function() {
    return summary_2.markdownSummary;
  } });
  var path_utils_1 = require_path_utils();
  Object.defineProperty(exports, "toPosixPath", { enumerable: !0, get: function() {
    return path_utils_1.toPosixPath;
  } });
  Object.defineProperty(exports, "toWin32Path", { enumerable: !0, get: function() {
    return path_utils_1.toWin32Path;
  } });
  Object.defineProperty(exports, "toPlatformPath", { enumerable: !0, get: function() {
    return path_utils_1.toPlatformPath;
  } });
  exports.platform = __importStar(require_platform());
});

export { require_auth, require_exec, require_core };

//# debugId=84FAFC5E10E00FE164756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vbm9kZV9tb2R1bGVzL0BhY3Rpb25zL2lvL2xpYi9pby11dGlsLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9pby9saWIvaW8uanMiLCAiLi4vbm9kZV9tb2R1bGVzL0BhY3Rpb25zL2V4ZWMvbGliL3Rvb2xydW5uZXIuanMiLCAiLi4vbm9kZV9tb2R1bGVzL0BhY3Rpb25zL2V4ZWMvbGliL2V4ZWMuanMiLCAiLi4vbm9kZV9tb2R1bGVzL0BhY3Rpb25zL2NvcmUvbGliL3V0aWxzLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9jb21tYW5kLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9maWxlLWNvbW1hbmQuanMiLCAiLi4vbm9kZV9tb2R1bGVzL0BhY3Rpb25zL2h0dHAtY2xpZW50L2xpYi9hdXRoLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9vaWRjLXV0aWxzLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9zdW1tYXJ5LmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9wYXRoLXV0aWxzLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9wbGF0Zm9ybS5qcyIsICIuLi9ub2RlX21vZHVsZXMvQGFjdGlvbnMvY29yZS9saWIvY29yZS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICAgICJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2NyZWF0ZUJpbmRpbmcgPSAodGhpcyAmJiB0aGlzLl9fY3JlYXRlQmluZGluZykgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBvW2syXSA9IG1ba107XG59KSk7XG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX3NldE1vZHVsZURlZmF1bHQpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XG59KTtcbnZhciBfX2ltcG9ydFN0YXIgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0U3RhcikgfHwgZnVuY3Rpb24gKG1vZCkge1xuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbnZhciBfYTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZ2V0Q21kUGF0aCA9IGV4cG9ydHMudHJ5R2V0RXhlY3V0YWJsZVBhdGggPSBleHBvcnRzLmlzUm9vdGVkID0gZXhwb3J0cy5pc0RpcmVjdG9yeSA9IGV4cG9ydHMuZXhpc3RzID0gZXhwb3J0cy5SRUFET05MWSA9IGV4cG9ydHMuVVZfRlNfT19FWExPQ0sgPSBleHBvcnRzLklTX1dJTkRPV1MgPSBleHBvcnRzLnVubGluayA9IGV4cG9ydHMuc3ltbGluayA9IGV4cG9ydHMuc3RhdCA9IGV4cG9ydHMucm1kaXIgPSBleHBvcnRzLnJtID0gZXhwb3J0cy5yZW5hbWUgPSBleHBvcnRzLnJlYWRsaW5rID0gZXhwb3J0cy5yZWFkZGlyID0gZXhwb3J0cy5vcGVuID0gZXhwb3J0cy5ta2RpciA9IGV4cG9ydHMubHN0YXQgPSBleHBvcnRzLmNvcHlGaWxlID0gZXhwb3J0cy5jaG1vZCA9IHZvaWQgMDtcbmNvbnN0IGZzID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJmc1wiKSk7XG5jb25zdCBwYXRoID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJwYXRoXCIpKTtcbl9hID0gZnMucHJvbWlzZXNcbi8vIGV4cG9ydCBjb25zdCB7b3Blbn0gPSAnZnMnXG4sIGV4cG9ydHMuY2htb2QgPSBfYS5jaG1vZCwgZXhwb3J0cy5jb3B5RmlsZSA9IF9hLmNvcHlGaWxlLCBleHBvcnRzLmxzdGF0ID0gX2EubHN0YXQsIGV4cG9ydHMubWtkaXIgPSBfYS5ta2RpciwgZXhwb3J0cy5vcGVuID0gX2Eub3BlbiwgZXhwb3J0cy5yZWFkZGlyID0gX2EucmVhZGRpciwgZXhwb3J0cy5yZWFkbGluayA9IF9hLnJlYWRsaW5rLCBleHBvcnRzLnJlbmFtZSA9IF9hLnJlbmFtZSwgZXhwb3J0cy5ybSA9IF9hLnJtLCBleHBvcnRzLnJtZGlyID0gX2Eucm1kaXIsIGV4cG9ydHMuc3RhdCA9IF9hLnN0YXQsIGV4cG9ydHMuc3ltbGluayA9IF9hLnN5bWxpbmssIGV4cG9ydHMudW5saW5rID0gX2EudW5saW5rO1xuLy8gZXhwb3J0IGNvbnN0IHtvcGVufSA9ICdmcydcbmV4cG9ydHMuSVNfV0lORE9XUyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2Jsb2IvZDAxNTNhZWUzNjc0MjJkMDg1ODEwNWFiZWMxODZkYTRkZmYwYTBjNS9kZXBzL3V2L2luY2x1ZGUvdXYvd2luLmgjTDY5MVxuZXhwb3J0cy5VVl9GU19PX0VYTE9DSyA9IDB4MTAwMDAwMDA7XG5leHBvcnRzLlJFQURPTkxZID0gZnMuY29uc3RhbnRzLk9fUkRPTkxZO1xuZnVuY3Rpb24gZXhpc3RzKGZzUGF0aCkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB5aWVsZCBleHBvcnRzLnN0YXQoZnNQYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xufVxuZXhwb3J0cy5leGlzdHMgPSBleGlzdHM7XG5mdW5jdGlvbiBpc0RpcmVjdG9yeShmc1BhdGgsIHVzZVN0YXQgPSBmYWxzZSkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdXNlU3RhdCA/IHlpZWxkIGV4cG9ydHMuc3RhdChmc1BhdGgpIDogeWllbGQgZXhwb3J0cy5sc3RhdChmc1BhdGgpO1xuICAgICAgICByZXR1cm4gc3RhdHMuaXNEaXJlY3RvcnkoKTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuaXNEaXJlY3RvcnkgPSBpc0RpcmVjdG9yeTtcbi8qKlxuICogT24gT1NYL0xpbnV4LCB0cnVlIGlmIHBhdGggc3RhcnRzIHdpdGggJy8nLiBPbiBXaW5kb3dzLCB0cnVlIGZvciBwYXRocyBsaWtlOlxuICogXFwsIFxcaGVsbG8sIFxcXFxoZWxsb1xcc2hhcmUsIEM6LCBhbmQgQzpcXGhlbGxvIChhbmQgY29ycmVzcG9uZGluZyBhbHRlcm5hdGUgc2VwYXJhdG9yIGNhc2VzKS5cbiAqL1xuZnVuY3Rpb24gaXNSb290ZWQocCkge1xuICAgIHAgPSBub3JtYWxpemVTZXBhcmF0b3JzKHApO1xuICAgIGlmICghcCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lzUm9vdGVkKCkgcGFyYW1ldGVyIFwicFwiIGNhbm5vdCBiZSBlbXB0eScpO1xuICAgIH1cbiAgICBpZiAoZXhwb3J0cy5JU19XSU5ET1dTKSB7XG4gICAgICAgIHJldHVybiAocC5zdGFydHNXaXRoKCdcXFxcJykgfHwgL15bQS1aXTovaS50ZXN0KHApIC8vIGUuZy4gXFwgb3IgXFxoZWxsbyBvciBcXFxcaGVsbG9cbiAgICAgICAgKTsgLy8gZS5nLiBDOiBvciBDOlxcaGVsbG9cbiAgICB9XG4gICAgcmV0dXJuIHAuc3RhcnRzV2l0aCgnLycpO1xufVxuZXhwb3J0cy5pc1Jvb3RlZCA9IGlzUm9vdGVkO1xuLyoqXG4gKiBCZXN0IGVmZm9ydCBhdHRlbXB0IHRvIGRldGVybWluZSB3aGV0aGVyIGEgZmlsZSBleGlzdHMgYW5kIGlzIGV4ZWN1dGFibGUuXG4gKiBAcGFyYW0gZmlsZVBhdGggICAgZmlsZSBwYXRoIHRvIGNoZWNrXG4gKiBAcGFyYW0gZXh0ZW5zaW9ucyAgYWRkaXRpb25hbCBmaWxlIGV4dGVuc2lvbnMgdG8gdHJ5XG4gKiBAcmV0dXJuIGlmIGZpbGUgZXhpc3RzIGFuZCBpcyBleGVjdXRhYmxlLCByZXR1cm5zIHRoZSBmaWxlIHBhdGguIG90aGVyd2lzZSBlbXB0eSBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIHRyeUdldEV4ZWN1dGFibGVQYXRoKGZpbGVQYXRoLCBleHRlbnNpb25zKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgbGV0IHN0YXRzID0gdW5kZWZpbmVkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gdGVzdCBmaWxlIGV4aXN0c1xuICAgICAgICAgICAgc3RhdHMgPSB5aWVsZCBleHBvcnRzLnN0YXQoZmlsZVBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBVbmV4cGVjdGVkIGVycm9yIGF0dGVtcHRpbmcgdG8gZGV0ZXJtaW5lIGlmIGV4ZWN1dGFibGUgZmlsZSBleGlzdHMgJyR7ZmlsZVBhdGh9JzogJHtlcnJ9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXRzICYmIHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICBpZiAoZXhwb3J0cy5JU19XSU5ET1dTKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gV2luZG93cywgdGVzdCBmb3IgdmFsaWQgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgY29uc3QgdXBwZXJFeHQgPSBwYXRoLmV4dG5hbWUoZmlsZVBhdGgpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbnMuc29tZSh2YWxpZEV4dCA9PiB2YWxpZEV4dC50b1VwcGVyQ2FzZSgpID09PSB1cHBlckV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVQYXRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChpc1VuaXhFeGVjdXRhYmxlKHN0YXRzKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsZVBhdGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIHRyeSBlYWNoIGV4dGVuc2lvblxuICAgICAgICBjb25zdCBvcmlnaW5hbEZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIGZvciAoY29uc3QgZXh0ZW5zaW9uIG9mIGV4dGVuc2lvbnMpIHtcbiAgICAgICAgICAgIGZpbGVQYXRoID0gb3JpZ2luYWxGaWxlUGF0aCArIGV4dGVuc2lvbjtcbiAgICAgICAgICAgIHN0YXRzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdGF0cyA9IHlpZWxkIGV4cG9ydHMuc3RhdChmaWxlUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVW5leHBlY3RlZCBlcnJvciBhdHRlbXB0aW5nIHRvIGRldGVybWluZSBpZiBleGVjdXRhYmxlIGZpbGUgZXhpc3RzICcke2ZpbGVQYXRofSc6ICR7ZXJyfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdGF0cyAmJiBzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICAgIGlmIChleHBvcnRzLklTX1dJTkRPV1MpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcHJlc2VydmUgdGhlIGNhc2Ugb2YgdGhlIGFjdHVhbCBmaWxlIChzaW5jZSBhbiBleHRlbnNpb24gd2FzIGFwcGVuZGVkKVxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlyZWN0b3J5ID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwcGVyTmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdHVhbE5hbWUgb2YgeWllbGQgZXhwb3J0cy5yZWFkZGlyKGRpcmVjdG9yeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodXBwZXJOYW1lID09PSBhY3R1YWxOYW1lLnRvVXBwZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGggPSBwYXRoLmpvaW4oZGlyZWN0b3J5LCBhY3R1YWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVW5leHBlY3RlZCBlcnJvciBhdHRlbXB0aW5nIHRvIGRldGVybWluZSB0aGUgYWN0dWFsIGNhc2Ugb2YgdGhlIGZpbGUgJyR7ZmlsZVBhdGh9JzogJHtlcnJ9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVQYXRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVW5peEV4ZWN1dGFibGUoc3RhdHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsZVBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0pO1xufVxuZXhwb3J0cy50cnlHZXRFeGVjdXRhYmxlUGF0aCA9IHRyeUdldEV4ZWN1dGFibGVQYXRoO1xuZnVuY3Rpb24gbm9ybWFsaXplU2VwYXJhdG9ycyhwKSB7XG4gICAgcCA9IHAgfHwgJyc7XG4gICAgaWYgKGV4cG9ydHMuSVNfV0lORE9XUykge1xuICAgICAgICAvLyBjb252ZXJ0IHNsYXNoZXMgb24gV2luZG93c1xuICAgICAgICBwID0gcC5yZXBsYWNlKC9cXC8vZywgJ1xcXFwnKTtcbiAgICAgICAgLy8gcmVtb3ZlIHJlZHVuZGFudCBzbGFzaGVzXG4gICAgICAgIHJldHVybiBwLnJlcGxhY2UoL1xcXFxcXFxcKy9nLCAnXFxcXCcpO1xuICAgIH1cbiAgICAvLyByZW1vdmUgcmVkdW5kYW50IHNsYXNoZXNcbiAgICByZXR1cm4gcC5yZXBsYWNlKC9cXC9cXC8rL2csICcvJyk7XG59XG4vLyBvbiBNYWMvTGludXgsIHRlc3QgdGhlIGV4ZWN1dGUgYml0XG4vLyAgICAgUiAgIFcgIFggIFIgIFcgWCBSIFcgWFxuLy8gICAyNTYgMTI4IDY0IDMyIDE2IDggNCAyIDFcbmZ1bmN0aW9uIGlzVW5peEV4ZWN1dGFibGUoc3RhdHMpIHtcbiAgICByZXR1cm4gKChzdGF0cy5tb2RlICYgMSkgPiAwIHx8XG4gICAgICAgICgoc3RhdHMubW9kZSAmIDgpID4gMCAmJiBzdGF0cy5naWQgPT09IHByb2Nlc3MuZ2V0Z2lkKCkpIHx8XG4gICAgICAgICgoc3RhdHMubW9kZSAmIDY0KSA+IDAgJiYgc3RhdHMudWlkID09PSBwcm9jZXNzLmdldHVpZCgpKSk7XG59XG4vLyBHZXQgdGhlIHBhdGggb2YgY21kLmV4ZSBpbiB3aW5kb3dzXG5mdW5jdGlvbiBnZXRDbWRQYXRoKCkge1xuICAgIHZhciBfYTtcbiAgICByZXR1cm4gKF9hID0gcHJvY2Vzcy5lbnZbJ0NPTVNQRUMnXSkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogYGNtZC5leGVgO1xufVxuZXhwb3J0cy5nZXRDbWRQYXRoID0gZ2V0Q21kUGF0aDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWlvLXV0aWwuanMubWFwIiwKICAgICJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2NyZWF0ZUJpbmRpbmcgPSAodGhpcyAmJiB0aGlzLl9fY3JlYXRlQmluZGluZykgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBvW2syXSA9IG1ba107XG59KSk7XG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX3NldE1vZHVsZURlZmF1bHQpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XG59KTtcbnZhciBfX2ltcG9ydFN0YXIgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0U3RhcikgfHwgZnVuY3Rpb24gKG1vZCkge1xuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZmluZEluUGF0aCA9IGV4cG9ydHMud2hpY2ggPSBleHBvcnRzLm1rZGlyUCA9IGV4cG9ydHMucm1SRiA9IGV4cG9ydHMubXYgPSBleHBvcnRzLmNwID0gdm9pZCAwO1xuY29uc3QgYXNzZXJ0XzEgPSByZXF1aXJlKFwiYXNzZXJ0XCIpO1xuY29uc3QgcGF0aCA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwicGF0aFwiKSk7XG5jb25zdCBpb1V0aWwgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcIi4vaW8tdXRpbFwiKSk7XG4vKipcbiAqIENvcGllcyBhIGZpbGUgb3IgZm9sZGVyLlxuICogQmFzZWQgb2ZmIG9mIHNoZWxsanMgLSBodHRwczovL2dpdGh1Yi5jb20vc2hlbGxqcy9zaGVsbGpzL2Jsb2IvOTIzN2Y2NmM1MmU1ZGFhNDA0NThmOTRmOTU2NWUxOGU4MTMyZjVhNi9zcmMvY3AuanNcbiAqXG4gKiBAcGFyYW0gICAgIHNvdXJjZSAgICBzb3VyY2UgcGF0aFxuICogQHBhcmFtICAgICBkZXN0ICAgICAgZGVzdGluYXRpb24gcGF0aFxuICogQHBhcmFtICAgICBvcHRpb25zICAgb3B0aW9uYWwuIFNlZSBDb3B5T3B0aW9ucy5cbiAqL1xuZnVuY3Rpb24gY3Aoc291cmNlLCBkZXN0LCBvcHRpb25zID0ge30pIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBjb25zdCB7IGZvcmNlLCByZWN1cnNpdmUsIGNvcHlTb3VyY2VEaXJlY3RvcnkgfSA9IHJlYWRDb3B5T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgY29uc3QgZGVzdFN0YXQgPSAoeWllbGQgaW9VdGlsLmV4aXN0cyhkZXN0KSkgPyB5aWVsZCBpb1V0aWwuc3RhdChkZXN0KSA6IG51bGw7XG4gICAgICAgIC8vIERlc3QgaXMgYW4gZXhpc3RpbmcgZmlsZSwgYnV0IG5vdCBmb3JjaW5nXG4gICAgICAgIGlmIChkZXN0U3RhdCAmJiBkZXN0U3RhdC5pc0ZpbGUoKSAmJiAhZm9yY2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBkZXN0IGlzIGFuIGV4aXN0aW5nIGRpcmVjdG9yeSwgc2hvdWxkIGNvcHkgaW5zaWRlLlxuICAgICAgICBjb25zdCBuZXdEZXN0ID0gZGVzdFN0YXQgJiYgZGVzdFN0YXQuaXNEaXJlY3RvcnkoKSAmJiBjb3B5U291cmNlRGlyZWN0b3J5XG4gICAgICAgICAgICA/IHBhdGguam9pbihkZXN0LCBwYXRoLmJhc2VuYW1lKHNvdXJjZSkpXG4gICAgICAgICAgICA6IGRlc3Q7XG4gICAgICAgIGlmICghKHlpZWxkIGlvVXRpbC5leGlzdHMoc291cmNlKSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeTogJHtzb3VyY2V9YCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc291cmNlU3RhdCA9IHlpZWxkIGlvVXRpbC5zdGF0KHNvdXJjZSk7XG4gICAgICAgIGlmIChzb3VyY2VTdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgIGlmICghcmVjdXJzaXZlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY29weS4gJHtzb3VyY2V9IGlzIGEgZGlyZWN0b3J5LCBidXQgdHJpZWQgdG8gY29weSB3aXRob3V0IHJlY3Vyc2l2ZSBmbGFnLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgeWllbGQgY3BEaXJSZWN1cnNpdmUoc291cmNlLCBuZXdEZXN0LCAwLCBmb3JjZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAocGF0aC5yZWxhdGl2ZShzb3VyY2UsIG5ld0Rlc3QpID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIGEgZmlsZSBjYW5ub3QgYmUgY29waWVkIHRvIGl0c2VsZlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJyR7bmV3RGVzdH0nIGFuZCAnJHtzb3VyY2V9JyBhcmUgdGhlIHNhbWUgZmlsZWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeWllbGQgY29weUZpbGUoc291cmNlLCBuZXdEZXN0LCBmb3JjZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbmV4cG9ydHMuY3AgPSBjcDtcbi8qKlxuICogTW92ZXMgYSBwYXRoLlxuICpcbiAqIEBwYXJhbSAgICAgc291cmNlICAgIHNvdXJjZSBwYXRoXG4gKiBAcGFyYW0gICAgIGRlc3QgICAgICBkZXN0aW5hdGlvbiBwYXRoXG4gKiBAcGFyYW0gICAgIG9wdGlvbnMgICBvcHRpb25hbC4gU2VlIE1vdmVPcHRpb25zLlxuICovXG5mdW5jdGlvbiBtdihzb3VyY2UsIGRlc3QsIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGlmICh5aWVsZCBpb1V0aWwuZXhpc3RzKGRlc3QpKSB7XG4gICAgICAgICAgICBsZXQgZGVzdEV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICBpZiAoeWllbGQgaW9VdGlsLmlzRGlyZWN0b3J5KGRlc3QpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgZGVzdCBpcyBkaXJlY3RvcnkgY29weSBzcmMgaW50byBkZXN0XG4gICAgICAgICAgICAgICAgZGVzdCA9IHBhdGguam9pbihkZXN0LCBwYXRoLmJhc2VuYW1lKHNvdXJjZSkpO1xuICAgICAgICAgICAgICAgIGRlc3RFeGlzdHMgPSB5aWVsZCBpb1V0aWwuZXhpc3RzKGRlc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRlc3RFeGlzdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5mb3JjZSA9PSBudWxsIHx8IG9wdGlvbnMuZm9yY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgcm1SRihkZXN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRGVzdGluYXRpb24gYWxyZWFkeSBleGlzdHMnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgeWllbGQgbWtkaXJQKHBhdGguZGlybmFtZShkZXN0KSk7XG4gICAgICAgIHlpZWxkIGlvVXRpbC5yZW5hbWUoc291cmNlLCBkZXN0KTtcbiAgICB9KTtcbn1cbmV4cG9ydHMubXYgPSBtdjtcbi8qKlxuICogUmVtb3ZlIGEgcGF0aCByZWN1cnNpdmVseSB3aXRoIGZvcmNlXG4gKlxuICogQHBhcmFtIGlucHV0UGF0aCBwYXRoIHRvIHJlbW92ZVxuICovXG5mdW5jdGlvbiBybVJGKGlucHV0UGF0aCkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGlmIChpb1V0aWwuSVNfV0lORE9XUykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGludmFsaWQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgLy8gaHR0cHM6Ly9kb2NzLm1pY3Jvc29mdC5jb20vZW4tdXMvd2luZG93cy93aW4zMi9maWxlaW8vbmFtaW5nLWEtZmlsZVxuICAgICAgICAgICAgaWYgKC9bKlwiPD58XS8udGVzdChpbnB1dFBhdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaWxlIHBhdGggbXVzdCBub3QgY29udGFpbiBgKmAsIGBcImAsIGA8YCwgYD5gIG9yIGB8YCBvbiBXaW5kb3dzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIG5vdGUgaWYgcGF0aCBkb2VzIG5vdCBleGlzdCwgZXJyb3IgaXMgc2lsZW50XG4gICAgICAgICAgICB5aWVsZCBpb1V0aWwucm0oaW5wdXRQYXRoLCB7XG4gICAgICAgICAgICAgICAgZm9yY2U6IHRydWUsXG4gICAgICAgICAgICAgICAgbWF4UmV0cmllczogMyxcbiAgICAgICAgICAgICAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgcmV0cnlEZWxheTogMzAwXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgd2FzIHVuYWJsZSB0byBiZSByZW1vdmVkICR7ZXJyfWApO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5leHBvcnRzLnJtUkYgPSBybVJGO1xuLyoqXG4gKiBNYWtlIGEgZGlyZWN0b3J5LiAgQ3JlYXRlcyB0aGUgZnVsbCBwYXRoIHdpdGggZm9sZGVycyBpbiBiZXR3ZWVuXG4gKiBXaWxsIHRocm93IGlmIGl0IGZhaWxzXG4gKlxuICogQHBhcmFtICAgZnNQYXRoICAgICAgICBwYXRoIHRvIGNyZWF0ZVxuICogQHJldHVybnMgUHJvbWlzZTx2b2lkPlxuICovXG5mdW5jdGlvbiBta2RpclAoZnNQYXRoKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgYXNzZXJ0XzEub2soZnNQYXRoLCAnYSBwYXRoIGFyZ3VtZW50IG11c3QgYmUgcHJvdmlkZWQnKTtcbiAgICAgICAgeWllbGQgaW9VdGlsLm1rZGlyKGZzUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgfSk7XG59XG5leHBvcnRzLm1rZGlyUCA9IG1rZGlyUDtcbi8qKlxuICogUmV0dXJucyBwYXRoIG9mIGEgdG9vbCBoYWQgdGhlIHRvb2wgYWN0dWFsbHkgYmVlbiBpbnZva2VkLiAgUmVzb2x2ZXMgdmlhIHBhdGhzLlxuICogSWYgeW91IGNoZWNrIGFuZCB0aGUgdG9vbCBkb2VzIG5vdCBleGlzdCwgaXQgd2lsbCB0aHJvdy5cbiAqXG4gKiBAcGFyYW0gICAgIHRvb2wgICAgICAgICAgICAgIG5hbWUgb2YgdGhlIHRvb2xcbiAqIEBwYXJhbSAgICAgY2hlY2sgICAgICAgICAgICAgd2hldGhlciB0byBjaGVjayBpZiB0b29sIGV4aXN0c1xuICogQHJldHVybnMgICBQcm9taXNlPHN0cmluZz4gICBwYXRoIHRvIHRvb2xcbiAqL1xuZnVuY3Rpb24gd2hpY2godG9vbCwgY2hlY2spIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBpZiAoIXRvb2wpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInBhcmFtZXRlciAndG9vbCcgaXMgcmVxdWlyZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVjdXJzaXZlIHdoZW4gY2hlY2s9dHJ1ZVxuICAgICAgICBpZiAoY2hlY2spIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHlpZWxkIHdoaWNoKHRvb2wsIGZhbHNlKTtcbiAgICAgICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlvVXRpbC5JU19XSU5ET1dTKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGxvY2F0ZSBleGVjdXRhYmxlIGZpbGU6ICR7dG9vbH0uIFBsZWFzZSB2ZXJpZnkgZWl0aGVyIHRoZSBmaWxlIHBhdGggZXhpc3RzIG9yIHRoZSBmaWxlIGNhbiBiZSBmb3VuZCB3aXRoaW4gYSBkaXJlY3Rvcnkgc3BlY2lmaWVkIGJ5IHRoZSBQQVRIIGVudmlyb25tZW50IHZhcmlhYmxlLiBBbHNvIHZlcmlmeSB0aGUgZmlsZSBoYXMgYSB2YWxpZCBleHRlbnNpb24gZm9yIGFuIGV4ZWN1dGFibGUgZmlsZS5gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGxvY2F0ZSBleGVjdXRhYmxlIGZpbGU6ICR7dG9vbH0uIFBsZWFzZSB2ZXJpZnkgZWl0aGVyIHRoZSBmaWxlIHBhdGggZXhpc3RzIG9yIHRoZSBmaWxlIGNhbiBiZSBmb3VuZCB3aXRoaW4gYSBkaXJlY3Rvcnkgc3BlY2lmaWVkIGJ5IHRoZSBQQVRIIGVudmlyb25tZW50IHZhcmlhYmxlLiBBbHNvIGNoZWNrIHRoZSBmaWxlIG1vZGUgdG8gdmVyaWZ5IHRoZSBmaWxlIGlzIGV4ZWN1dGFibGUuYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXRjaGVzID0geWllbGQgZmluZEluUGF0aCh0b29sKTtcbiAgICAgICAgaWYgKG1hdGNoZXMgJiYgbWF0Y2hlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hlc1swXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSk7XG59XG5leHBvcnRzLndoaWNoID0gd2hpY2g7XG4vKipcbiAqIFJldHVybnMgYSBsaXN0IG9mIGFsbCBvY2N1cnJlbmNlcyBvZiB0aGUgZ2l2ZW4gdG9vbCBvbiB0aGUgc3lzdGVtIHBhdGguXG4gKlxuICogQHJldHVybnMgICBQcm9taXNlPHN0cmluZ1tdPiAgdGhlIHBhdGhzIG9mIHRoZSB0b29sXG4gKi9cbmZ1bmN0aW9uIGZpbmRJblBhdGgodG9vbCkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGlmICghdG9vbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwicGFyYW1ldGVyICd0b29sJyBpcyByZXF1aXJlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBidWlsZCB0aGUgbGlzdCBvZiBleHRlbnNpb25zIHRvIHRyeVxuICAgICAgICBjb25zdCBleHRlbnNpb25zID0gW107XG4gICAgICAgIGlmIChpb1V0aWwuSVNfV0lORE9XUyAmJiBwcm9jZXNzLmVudlsnUEFUSEVYVCddKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGV4dGVuc2lvbiBvZiBwcm9jZXNzLmVudlsnUEFUSEVYVCddLnNwbGl0KHBhdGguZGVsaW1pdGVyKSkge1xuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9ucy5wdXNoKGV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGlmIGl0J3Mgcm9vdGVkLCByZXR1cm4gaXQgaWYgZXhpc3RzLiBvdGhlcndpc2UgcmV0dXJuIGVtcHR5LlxuICAgICAgICBpZiAoaW9VdGlsLmlzUm9vdGVkKHRvb2wpKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHlpZWxkIGlvVXRpbC50cnlHZXRFeGVjdXRhYmxlUGF0aCh0b29sLCBleHRlbnNpb25zKTtcbiAgICAgICAgICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbZmlsZVBhdGhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIGFueSBwYXRoIHNlcGFyYXRvcnMsIHJldHVybiBlbXB0eVxuICAgICAgICBpZiAodG9vbC5pbmNsdWRlcyhwYXRoLnNlcCkpIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBidWlsZCB0aGUgbGlzdCBvZiBkaXJlY3Rvcmllc1xuICAgICAgICAvL1xuICAgICAgICAvLyBOb3RlLCB0ZWNobmljYWxseSBcIndoZXJlXCIgY2hlY2tzIHRoZSBjdXJyZW50IGRpcmVjdG9yeSBvbiBXaW5kb3dzLiBGcm9tIGEgdG9vbGtpdCBwZXJzcGVjdGl2ZSxcbiAgICAgICAgLy8gaXQgZmVlbHMgbGlrZSB3ZSBzaG91bGQgbm90IGRvIHRoaXMuIENoZWNraW5nIHRoZSBjdXJyZW50IGRpcmVjdG9yeSBzZWVtcyBsaWtlIG1vcmUgb2YgYSB1c2VcbiAgICAgICAgLy8gY2FzZSBvZiBhIHNoZWxsLCBhbmQgdGhlIHdoaWNoKCkgZnVuY3Rpb24gZXhwb3NlZCBieSB0aGUgdG9vbGtpdCBzaG91bGQgc3RyaXZlIGZvciBjb25zaXN0ZW5jeVxuICAgICAgICAvLyBhY3Jvc3MgcGxhdGZvcm1zLlxuICAgICAgICBjb25zdCBkaXJlY3RvcmllcyA9IFtdO1xuICAgICAgICBpZiAocHJvY2Vzcy5lbnYuUEFUSCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBwIG9mIHByb2Nlc3MuZW52LlBBVEguc3BsaXQocGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHApIHtcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3JpZXMucHVzaChwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gZmluZCBhbGwgbWF0Y2hlc1xuICAgICAgICBjb25zdCBtYXRjaGVzID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZGlyZWN0b3J5IG9mIGRpcmVjdG9yaWVzKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHlpZWxkIGlvVXRpbC50cnlHZXRFeGVjdXRhYmxlUGF0aChwYXRoLmpvaW4oZGlyZWN0b3J5LCB0b29sKSwgZXh0ZW5zaW9ucyk7XG4gICAgICAgICAgICBpZiAoZmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2goZmlsZVBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYXRjaGVzO1xuICAgIH0pO1xufVxuZXhwb3J0cy5maW5kSW5QYXRoID0gZmluZEluUGF0aDtcbmZ1bmN0aW9uIHJlYWRDb3B5T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgY29uc3QgZm9yY2UgPSBvcHRpb25zLmZvcmNlID09IG51bGwgPyB0cnVlIDogb3B0aW9ucy5mb3JjZTtcbiAgICBjb25zdCByZWN1cnNpdmUgPSBCb29sZWFuKG9wdGlvbnMucmVjdXJzaXZlKTtcbiAgICBjb25zdCBjb3B5U291cmNlRGlyZWN0b3J5ID0gb3B0aW9ucy5jb3B5U291cmNlRGlyZWN0b3J5ID09IG51bGxcbiAgICAgICAgPyB0cnVlXG4gICAgICAgIDogQm9vbGVhbihvcHRpb25zLmNvcHlTb3VyY2VEaXJlY3RvcnkpO1xuICAgIHJldHVybiB7IGZvcmNlLCByZWN1cnNpdmUsIGNvcHlTb3VyY2VEaXJlY3RvcnkgfTtcbn1cbmZ1bmN0aW9uIGNwRGlyUmVjdXJzaXZlKHNvdXJjZURpciwgZGVzdERpciwgY3VycmVudERlcHRoLCBmb3JjZSkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIC8vIEVuc3VyZSB0aGVyZSBpcyBub3QgYSBydW4gYXdheSByZWN1cnNpdmUgY29weVxuICAgICAgICBpZiAoY3VycmVudERlcHRoID49IDI1NSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY3VycmVudERlcHRoKys7XG4gICAgICAgIHlpZWxkIG1rZGlyUChkZXN0RGlyKTtcbiAgICAgICAgY29uc3QgZmlsZXMgPSB5aWVsZCBpb1V0aWwucmVhZGRpcihzb3VyY2VEaXIpO1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGVOYW1lIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICBjb25zdCBzcmNGaWxlID0gYCR7c291cmNlRGlyfS8ke2ZpbGVOYW1lfWA7XG4gICAgICAgICAgICBjb25zdCBkZXN0RmlsZSA9IGAke2Rlc3REaXJ9LyR7ZmlsZU5hbWV9YDtcbiAgICAgICAgICAgIGNvbnN0IHNyY0ZpbGVTdGF0ID0geWllbGQgaW9VdGlsLmxzdGF0KHNyY0ZpbGUpO1xuICAgICAgICAgICAgaWYgKHNyY0ZpbGVTdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBSZWN1cnNlXG4gICAgICAgICAgICAgICAgeWllbGQgY3BEaXJSZWN1cnNpdmUoc3JjRmlsZSwgZGVzdEZpbGUsIGN1cnJlbnREZXB0aCwgZm9yY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgeWllbGQgY29weUZpbGUoc3JjRmlsZSwgZGVzdEZpbGUsIGZvcmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBDaGFuZ2UgdGhlIG1vZGUgZm9yIHRoZSBuZXdseSBjcmVhdGVkIGRpcmVjdG9yeVxuICAgICAgICB5aWVsZCBpb1V0aWwuY2htb2QoZGVzdERpciwgKHlpZWxkIGlvVXRpbC5zdGF0KHNvdXJjZURpcikpLm1vZGUpO1xuICAgIH0pO1xufVxuLy8gQnVmZmVyZWQgZmlsZSBjb3B5XG5mdW5jdGlvbiBjb3B5RmlsZShzcmNGaWxlLCBkZXN0RmlsZSwgZm9yY2UpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBpZiAoKHlpZWxkIGlvVXRpbC5sc3RhdChzcmNGaWxlKSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgLy8gdW5saW5rL3JlLWxpbmsgaXRcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgeWllbGQgaW9VdGlsLmxzdGF0KGRlc3RGaWxlKTtcbiAgICAgICAgICAgICAgICB5aWVsZCBpb1V0aWwudW5saW5rKGRlc3RGaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IHRvIG92ZXJyaWRlIGZpbGUgcGVybWlzc2lvblxuICAgICAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdFUEVSTScpIHtcbiAgICAgICAgICAgICAgICAgICAgeWllbGQgaW9VdGlsLmNobW9kKGRlc3RGaWxlLCAnMDY2NicpO1xuICAgICAgICAgICAgICAgICAgICB5aWVsZCBpb1V0aWwudW5saW5rKGRlc3RGaWxlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gb3RoZXIgZXJyb3JzID0gaXQgZG9lc24ndCBleGlzdCwgbm8gd29yayB0byBkb1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ29weSBvdmVyIHN5bWxpbmtcbiAgICAgICAgICAgIGNvbnN0IHN5bWxpbmtGdWxsID0geWllbGQgaW9VdGlsLnJlYWRsaW5rKHNyY0ZpbGUpO1xuICAgICAgICAgICAgeWllbGQgaW9VdGlsLnN5bWxpbmsoc3ltbGlua0Z1bGwsIGRlc3RGaWxlLCBpb1V0aWwuSVNfV0lORE9XUyA/ICdqdW5jdGlvbicgOiBudWxsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghKHlpZWxkIGlvVXRpbC5leGlzdHMoZGVzdEZpbGUpKSB8fCBmb3JjZSkge1xuICAgICAgICAgICAgeWllbGQgaW9VdGlsLmNvcHlGaWxlKHNyY0ZpbGUsIGRlc3RGaWxlKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW8uanMubWFwIiwKICAgICJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2NyZWF0ZUJpbmRpbmcgPSAodGhpcyAmJiB0aGlzLl9fY3JlYXRlQmluZGluZykgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBvW2syXSA9IG1ba107XG59KSk7XG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX3NldE1vZHVsZURlZmF1bHQpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XG59KTtcbnZhciBfX2ltcG9ydFN0YXIgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0U3RhcikgfHwgZnVuY3Rpb24gKG1vZCkge1xuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuYXJnU3RyaW5nVG9BcnJheSA9IGV4cG9ydHMuVG9vbFJ1bm5lciA9IHZvaWQgMDtcbmNvbnN0IG9zID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJvc1wiKSk7XG5jb25zdCBldmVudHMgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcImV2ZW50c1wiKSk7XG5jb25zdCBjaGlsZCA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwiY2hpbGRfcHJvY2Vzc1wiKSk7XG5jb25zdCBwYXRoID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJwYXRoXCIpKTtcbmNvbnN0IGlvID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJAYWN0aW9ucy9pb1wiKSk7XG5jb25zdCBpb1V0aWwgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcIkBhY3Rpb25zL2lvL2xpYi9pby11dGlsXCIpKTtcbmNvbnN0IHRpbWVyc18xID0gcmVxdWlyZShcInRpbWVyc1wiKTtcbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZCAqL1xuY29uc3QgSVNfV0lORE9XUyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG4vKlxuICogQ2xhc3MgZm9yIHJ1bm5pbmcgY29tbWFuZCBsaW5lIHRvb2xzLiBIYW5kbGVzIHF1b3RpbmcgYW5kIGFyZyBwYXJzaW5nIGluIGEgcGxhdGZvcm0gYWdub3N0aWMgd2F5LlxuICovXG5jbGFzcyBUb29sUnVubmVyIGV4dGVuZHMgZXZlbnRzLkV2ZW50RW1pdHRlciB7XG4gICAgY29uc3RydWN0b3IodG9vbFBhdGgsIGFyZ3MsIG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgaWYgKCF0b29sUGF0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUGFyYW1ldGVyICd0b29sUGF0aCcgY2Fubm90IGJlIG51bGwgb3IgZW1wdHkuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudG9vbFBhdGggPSB0b29sUGF0aDtcbiAgICAgICAgdGhpcy5hcmdzID0gYXJncyB8fCBbXTtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB9XG4gICAgX2RlYnVnKG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5saXN0ZW5lcnMgJiYgdGhpcy5vcHRpb25zLmxpc3RlbmVycy5kZWJ1Zykge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLmxpc3RlbmVycy5kZWJ1ZyhtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfZ2V0Q29tbWFuZFN0cmluZyhvcHRpb25zLCBub1ByZWZpeCkge1xuICAgICAgICBjb25zdCB0b29sUGF0aCA9IHRoaXMuX2dldFNwYXduRmlsZU5hbWUoKTtcbiAgICAgICAgY29uc3QgYXJncyA9IHRoaXMuX2dldFNwYXduQXJncyhvcHRpb25zKTtcbiAgICAgICAgbGV0IGNtZCA9IG5vUHJlZml4ID8gJycgOiAnW2NvbW1hbmRdJzsgLy8gb21pdCBwcmVmaXggd2hlbiBwaXBlZCB0byBhIHNlY29uZCB0b29sXG4gICAgICAgIGlmIChJU19XSU5ET1dTKSB7XG4gICAgICAgICAgICAvLyBXaW5kb3dzICsgY21kIGZpbGVcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc0NtZEZpbGUoKSkge1xuICAgICAgICAgICAgICAgIGNtZCArPSB0b29sUGF0aDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGEgb2YgYXJncykge1xuICAgICAgICAgICAgICAgICAgICBjbWQgKz0gYCAke2F9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBXaW5kb3dzICsgdmVyYmF0aW1cbiAgICAgICAgICAgIGVsc2UgaWYgKG9wdGlvbnMud2luZG93c1ZlcmJhdGltQXJndW1lbnRzKSB7XG4gICAgICAgICAgICAgICAgY21kICs9IGBcIiR7dG9vbFBhdGh9XCJgO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYSBvZiBhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNtZCArPSBgICR7YX1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFdpbmRvd3MgKHJlZ3VsYXIpXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjbWQgKz0gdGhpcy5fd2luZG93c1F1b3RlQ21kQXJnKHRvb2xQYXRoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGEgb2YgYXJncykge1xuICAgICAgICAgICAgICAgICAgICBjbWQgKz0gYCAke3RoaXMuX3dpbmRvd3NRdW90ZUNtZEFyZyhhKX1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIE9TWC9MaW51eCAtIHRoaXMgY2FuIGxpa2VseSBiZSBpbXByb3ZlZCB3aXRoIHNvbWUgZm9ybSBvZiBxdW90aW5nLlxuICAgICAgICAgICAgLy8gY3JlYXRpbmcgcHJvY2Vzc2VzIG9uIFVuaXggaXMgZnVuZGFtZW50YWxseSBkaWZmZXJlbnQgdGhhbiBXaW5kb3dzLlxuICAgICAgICAgICAgLy8gb24gVW5peCwgZXhlY3ZwKCkgdGFrZXMgYW4gYXJnIGFycmF5LlxuICAgICAgICAgICAgY21kICs9IHRvb2xQYXRoO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhIG9mIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBjbWQgKz0gYCAke2F9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY21kO1xuICAgIH1cbiAgICBfcHJvY2Vzc0xpbmVCdWZmZXIoZGF0YSwgc3RyQnVmZmVyLCBvbkxpbmUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCBzID0gc3RyQnVmZmVyICsgZGF0YS50b1N0cmluZygpO1xuICAgICAgICAgICAgbGV0IG4gPSBzLmluZGV4T2Yob3MuRU9MKTtcbiAgICAgICAgICAgIHdoaWxlIChuID4gLTEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsaW5lID0gcy5zdWJzdHJpbmcoMCwgbik7XG4gICAgICAgICAgICAgICAgb25MaW5lKGxpbmUpO1xuICAgICAgICAgICAgICAgIC8vIHRoZSByZXN0IG9mIHRoZSBzdHJpbmcgLi4uXG4gICAgICAgICAgICAgICAgcyA9IHMuc3Vic3RyaW5nKG4gKyBvcy5FT0wubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBuID0gcy5pbmRleE9mKG9zLkVPTCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAvLyBzdHJlYW1pbmcgbGluZXMgdG8gY29uc29sZSBpcyBiZXN0IGVmZm9ydC4gIERvbid0IGZhaWwgYSBidWlsZC5cbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBlcnJvciBwcm9jZXNzaW5nIGxpbmUuIEZhaWxlZCB3aXRoIGVycm9yICR7ZXJyfWApO1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9nZXRTcGF3bkZpbGVOYW1lKCkge1xuICAgICAgICBpZiAoSVNfV0lORE9XUykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzQ21kRmlsZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3MuZW52WydDT01TUEVDJ10gfHwgJ2NtZC5leGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnRvb2xQYXRoO1xuICAgIH1cbiAgICBfZ2V0U3Bhd25BcmdzKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKElTX1dJTkRPV1MpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc0NtZEZpbGUoKSkge1xuICAgICAgICAgICAgICAgIGxldCBhcmdsaW5lID0gYC9EIC9TIC9DIFwiJHt0aGlzLl93aW5kb3dzUXVvdGVDbWRBcmcodGhpcy50b29sUGF0aCl9YDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGEgb2YgdGhpcy5hcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFyZ2xpbmUgKz0gJyAnO1xuICAgICAgICAgICAgICAgICAgICBhcmdsaW5lICs9IG9wdGlvbnMud2luZG93c1ZlcmJhdGltQXJndW1lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGFcbiAgICAgICAgICAgICAgICAgICAgICAgIDogdGhpcy5fd2luZG93c1F1b3RlQ21kQXJnKGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhcmdsaW5lICs9ICdcIic7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFthcmdsaW5lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5hcmdzO1xuICAgIH1cbiAgICBfZW5kc1dpdGgoc3RyLCBlbmQpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5lbmRzV2l0aChlbmQpO1xuICAgIH1cbiAgICBfaXNDbWRGaWxlKCkge1xuICAgICAgICBjb25zdCB1cHBlclRvb2xQYXRoID0gdGhpcy50b29sUGF0aC50b1VwcGVyQ2FzZSgpO1xuICAgICAgICByZXR1cm4gKHRoaXMuX2VuZHNXaXRoKHVwcGVyVG9vbFBhdGgsICcuQ01EJykgfHxcbiAgICAgICAgICAgIHRoaXMuX2VuZHNXaXRoKHVwcGVyVG9vbFBhdGgsICcuQkFUJykpO1xuICAgIH1cbiAgICBfd2luZG93c1F1b3RlQ21kQXJnKGFyZykge1xuICAgICAgICAvLyBmb3IgLmV4ZSwgYXBwbHkgdGhlIG5vcm1hbCBxdW90aW5nIHJ1bGVzIHRoYXQgbGlidXYgYXBwbGllc1xuICAgICAgICBpZiAoIXRoaXMuX2lzQ21kRmlsZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fdXZRdW90ZUNtZEFyZyhhcmcpO1xuICAgICAgICB9XG4gICAgICAgIC8vIG90aGVyd2lzZSBhcHBseSBxdW90aW5nIHJ1bGVzIHNwZWNpZmljIHRvIHRoZSBjbWQuZXhlIGNvbW1hbmQgbGluZSBwYXJzZXIuXG4gICAgICAgIC8vIHRoZSBsaWJ1diBydWxlcyBhcmUgZ2VuZXJpYyBhbmQgYXJlIG5vdCBkZXNpZ25lZCBzcGVjaWZpY2FsbHkgZm9yIGNtZC5leGVcbiAgICAgICAgLy8gY29tbWFuZCBsaW5lIHBhcnNlci5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gZm9yIGEgZGV0YWlsZWQgZGVzY3JpcHRpb24gb2YgdGhlIGNtZC5leGUgY29tbWFuZCBsaW5lIHBhcnNlciwgcmVmZXIgdG9cbiAgICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80MDk0Njk5L2hvdy1kb2VzLXRoZS13aW5kb3dzLWNvbW1hbmQtaW50ZXJwcmV0ZXItY21kLWV4ZS1wYXJzZS1zY3JpcHRzLzc5NzA5MTIjNzk3MDkxMlxuICAgICAgICAvLyBuZWVkIHF1b3RlcyBmb3IgZW1wdHkgYXJnXG4gICAgICAgIGlmICghYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1wiXCInO1xuICAgICAgICB9XG4gICAgICAgIC8vIGRldGVybWluZSB3aGV0aGVyIHRoZSBhcmcgbmVlZHMgdG8gYmUgcXVvdGVkXG4gICAgICAgIGNvbnN0IGNtZFNwZWNpYWxDaGFycyA9IFtcbiAgICAgICAgICAgICcgJyxcbiAgICAgICAgICAgICdcXHQnLFxuICAgICAgICAgICAgJyYnLFxuICAgICAgICAgICAgJygnLFxuICAgICAgICAgICAgJyknLFxuICAgICAgICAgICAgJ1snLFxuICAgICAgICAgICAgJ10nLFxuICAgICAgICAgICAgJ3snLFxuICAgICAgICAgICAgJ30nLFxuICAgICAgICAgICAgJ14nLFxuICAgICAgICAgICAgJz0nLFxuICAgICAgICAgICAgJzsnLFxuICAgICAgICAgICAgJyEnLFxuICAgICAgICAgICAgXCInXCIsXG4gICAgICAgICAgICAnKycsXG4gICAgICAgICAgICAnLCcsXG4gICAgICAgICAgICAnYCcsXG4gICAgICAgICAgICAnficsXG4gICAgICAgICAgICAnfCcsXG4gICAgICAgICAgICAnPCcsXG4gICAgICAgICAgICAnPicsXG4gICAgICAgICAgICAnXCInXG4gICAgICAgIF07XG4gICAgICAgIGxldCBuZWVkc1F1b3RlcyA9IGZhbHNlO1xuICAgICAgICBmb3IgKGNvbnN0IGNoYXIgb2YgYXJnKSB7XG4gICAgICAgICAgICBpZiAoY21kU3BlY2lhbENoYXJzLnNvbWUoeCA9PiB4ID09PSBjaGFyKSkge1xuICAgICAgICAgICAgICAgIG5lZWRzUXVvdGVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBzaG9ydC1jaXJjdWl0IGlmIHF1b3RlcyBub3QgbmVlZGVkXG4gICAgICAgIGlmICghbmVlZHNRdW90ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdGhlIGZvbGxvd2luZyBxdW90aW5nIHJ1bGVzIGFyZSB2ZXJ5IHNpbWlsYXIgdG8gdGhlIHJ1bGVzIHRoYXQgYnkgbGlidXYgYXBwbGllcy5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gMSkgd3JhcCB0aGUgc3RyaW5nIGluIHF1b3Rlc1xuICAgICAgICAvL1xuICAgICAgICAvLyAyKSBkb3VibGUtdXAgcXVvdGVzIC0gaS5lLiBcIiA9PiBcIlwiXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgIHRoaXMgaXMgZGlmZmVyZW50IGZyb20gdGhlIGxpYnV2IHF1b3RpbmcgcnVsZXMuIGxpYnV2IHJlcGxhY2VzIFwiIHdpdGggXFxcIiwgd2hpY2ggdW5mb3J0dW5hdGVseVxuICAgICAgICAvLyAgICBkb2Vzbid0IHdvcmsgd2VsbCB3aXRoIGEgY21kLmV4ZSBjb21tYW5kIGxpbmUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgIG5vdGUsIHJlcGxhY2luZyBcIiB3aXRoIFwiXCIgYWxzbyB3b3JrcyB3ZWxsIGlmIHRoZSBhcmcgaXMgcGFzc2VkIHRvIGEgZG93bnN0cmVhbSAuTkVUIGNvbnNvbGUgYXBwLlxuICAgICAgICAvLyAgICBmb3IgZXhhbXBsZSwgdGhlIGNvbW1hbmQgbGluZTpcbiAgICAgICAgLy8gICAgICAgICAgZm9vLmV4ZSBcIm15YXJnOlwiXCJteSB2YWxcIlwiXCJcbiAgICAgICAgLy8gICAgaXMgcGFyc2VkIGJ5IGEgLk5FVCBjb25zb2xlIGFwcCBpbnRvIGFuIGFyZyBhcnJheTpcbiAgICAgICAgLy8gICAgICAgICAgWyBcIm15YXJnOlxcXCJteSB2YWxcXFwiXCIgXVxuICAgICAgICAvLyAgICB3aGljaCBpcyB0aGUgc2FtZSBlbmQgcmVzdWx0IHdoZW4gYXBwbHlpbmcgbGlidXYgcXVvdGluZyBydWxlcy4gYWx0aG91Z2ggdGhlIGFjdHVhbFxuICAgICAgICAvLyAgICBjb21tYW5kIGxpbmUgZnJvbSBsaWJ1diBxdW90aW5nIHJ1bGVzIHdvdWxkIGxvb2sgbGlrZTpcbiAgICAgICAgLy8gICAgICAgICAgZm9vLmV4ZSBcIm15YXJnOlxcXCJteSB2YWxcXFwiXCJcbiAgICAgICAgLy9cbiAgICAgICAgLy8gMykgZG91YmxlLXVwIHNsYXNoZXMgdGhhdCBwcmVjZWRlIGEgcXVvdGUsXG4gICAgICAgIC8vICAgIGUuZy4gIGhlbGxvIFxcd29ybGQgICAgPT4gXCJoZWxsbyBcXHdvcmxkXCJcbiAgICAgICAgLy8gICAgICAgICAgaGVsbG9cXFwid29ybGQgICAgPT4gXCJoZWxsb1xcXFxcIlwid29ybGRcIlxuICAgICAgICAvLyAgICAgICAgICBoZWxsb1xcXFxcIndvcmxkICAgPT4gXCJoZWxsb1xcXFxcXFxcXCJcIndvcmxkXCJcbiAgICAgICAgLy8gICAgICAgICAgaGVsbG8gd29ybGRcXCAgICA9PiBcImhlbGxvIHdvcmxkXFxcXFwiXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgIHRlY2huaWNhbGx5IHRoaXMgaXMgbm90IHJlcXVpcmVkIGZvciBhIGNtZC5leGUgY29tbWFuZCBsaW5lLCBvciB0aGUgYmF0Y2ggYXJndW1lbnQgcGFyc2VyLlxuICAgICAgICAvLyAgICB0aGUgcmVhc29ucyBmb3IgaW5jbHVkaW5nIHRoaXMgYXMgYSAuY21kIHF1b3RpbmcgcnVsZSBhcmU6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgIGEpIHRoaXMgaXMgb3B0aW1pemVkIGZvciB0aGUgc2NlbmFyaW8gd2hlcmUgdGhlIGFyZ3VtZW50IGlzIHBhc3NlZCBmcm9tIHRoZSAuY21kIGZpbGUgdG8gYW5cbiAgICAgICAgLy8gICAgICAgZXh0ZXJuYWwgcHJvZ3JhbS4gbWFueSBwcm9ncmFtcyAoZS5nLiAuTkVUIGNvbnNvbGUgYXBwcykgcmVseSBvbiB0aGUgc2xhc2gtZG91YmxpbmcgcnVsZS5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgYikgaXQncyB3aGF0IHdlJ3ZlIGJlZW4gZG9pbmcgcHJldmlvdXNseSAoYnkgZGVmZXJyaW5nIHRvIG5vZGUgZGVmYXVsdCBiZWhhdmlvcikgYW5kIHdlXG4gICAgICAgIC8vICAgICAgIGhhdmVuJ3QgaGVhcmQgYW55IGNvbXBsYWludHMgYWJvdXQgdGhhdCBhc3BlY3QuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIG5vdGUsIGEgd2Vha25lc3Mgb2YgdGhlIHF1b3RpbmcgcnVsZXMgY2hvc2VuIGhlcmUsIGlzIHRoYXQgJSBpcyBub3QgZXNjYXBlZC4gaW4gZmFjdCwgJSBjYW5ub3QgYmVcbiAgICAgICAgLy8gZXNjYXBlZCB3aGVuIHVzZWQgb24gdGhlIGNvbW1hbmQgbGluZSBkaXJlY3RseSAtIGV2ZW4gdGhvdWdoIHdpdGhpbiBhIC5jbWQgZmlsZSAlIGNhbiBiZSBlc2NhcGVkXG4gICAgICAgIC8vIGJ5IHVzaW5nICUlLlxuICAgICAgICAvL1xuICAgICAgICAvLyB0aGUgc2F2aW5nIGdyYWNlIGlzLCBvbiB0aGUgY29tbWFuZCBsaW5lLCAldmFyJSBpcyBsZWZ0IGFzLWlzIGlmIHZhciBpcyBub3QgZGVmaW5lZC4gdGhpcyBjb250cmFzdHNcbiAgICAgICAgLy8gdGhlIGxpbmUgcGFyc2luZyBydWxlcyB3aXRoaW4gYSAuY21kIGZpbGUsIHdoZXJlIGlmIHZhciBpcyBub3QgZGVmaW5lZCBpdCBpcyByZXBsYWNlZCB3aXRoIG5vdGhpbmcuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIG9uZSBvcHRpb24gdGhhdCB3YXMgZXhwbG9yZWQgd2FzIHJlcGxhY2luZyAlIHdpdGggXiUgLSBpLmUuICV2YXIlID0+IF4ldmFyXiUuIHRoaXMgaGFjayB3b3VsZFxuICAgICAgICAvLyBvZnRlbiB3b3JrLCBzaW5jZSBpdCBpcyB1bmxpa2VseSB0aGF0IHZhcl4gd291bGQgZXhpc3QsIGFuZCB0aGUgXiBjaGFyYWN0ZXIgaXMgcmVtb3ZlZCB3aGVuIHRoZVxuICAgICAgICAvLyB2YXJpYWJsZSBpcyB1c2VkLiB0aGUgcHJvYmxlbSwgaG93ZXZlciwgaXMgdGhhdCBeIGlzIG5vdCByZW1vdmVkIHdoZW4gJSogaXMgdXNlZCB0byBwYXNzIHRoZSBhcmdzXG4gICAgICAgIC8vIHRvIGFuIGV4dGVybmFsIHByb2dyYW0uXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGFuIHVuZXhwbG9yZWQgcG90ZW50aWFsIHNvbHV0aW9uIGZvciB0aGUgJSBlc2NhcGluZyBwcm9ibGVtLCBpcyB0byBjcmVhdGUgYSB3cmFwcGVyIC5jbWQgZmlsZS5cbiAgICAgICAgLy8gJSBjYW4gYmUgZXNjYXBlZCB3aXRoaW4gYSAuY21kIGZpbGUuXG4gICAgICAgIGxldCByZXZlcnNlID0gJ1wiJztcbiAgICAgICAgbGV0IHF1b3RlSGl0ID0gdHJ1ZTtcbiAgICAgICAgZm9yIChsZXQgaSA9IGFyZy5sZW5ndGg7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgICAgIC8vIHdhbGsgdGhlIHN0cmluZyBpbiByZXZlcnNlXG4gICAgICAgICAgICByZXZlcnNlICs9IGFyZ1tpIC0gMV07XG4gICAgICAgICAgICBpZiAocXVvdGVIaXQgJiYgYXJnW2kgLSAxXSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgcmV2ZXJzZSArPSAnXFxcXCc7IC8vIGRvdWJsZSB0aGUgc2xhc2hcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGFyZ1tpIC0gMV0gPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgICBxdW90ZUhpdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV2ZXJzZSArPSAnXCInOyAvLyBkb3VibGUgdGhlIHF1b3RlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBxdW90ZUhpdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldmVyc2UgKz0gJ1wiJztcbiAgICAgICAgcmV0dXJuIHJldmVyc2VcbiAgICAgICAgICAgIC5zcGxpdCgnJylcbiAgICAgICAgICAgIC5yZXZlcnNlKClcbiAgICAgICAgICAgIC5qb2luKCcnKTtcbiAgICB9XG4gICAgX3V2UXVvdGVDbWRBcmcoYXJnKSB7XG4gICAgICAgIC8vIFRvb2wgcnVubmVyIHdyYXBzIGNoaWxkX3Byb2Nlc3Muc3Bhd24oKSBhbmQgbmVlZHMgdG8gYXBwbHkgdGhlIHNhbWUgcXVvdGluZyBhc1xuICAgICAgICAvLyBOb2RlIGluIGNlcnRhaW4gY2FzZXMgd2hlcmUgdGhlIHVuZG9jdW1lbnRlZCBzcGF3biBvcHRpb24gd2luZG93c1ZlcmJhdGltQXJndW1lbnRzXG4gICAgICAgIC8vIGlzIHVzZWQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFNpbmNlIHRoaXMgZnVuY3Rpb24gaXMgYSBwb3J0IG9mIHF1b3RlX2NtZF9hcmcgZnJvbSBOb2RlIDQueCAodGVjaG5pY2FsbHksIGxpYiBVVixcbiAgICAgICAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9ibG9iL3Y0LngvZGVwcy91di9zcmMvd2luL3Byb2Nlc3MuYyBmb3IgZGV0YWlscyksXG4gICAgICAgIC8vIHBhc3RpbmcgY29weXJpZ2h0IG5vdGljZSBmcm9tIE5vZGUgd2l0aGluIHRoaXMgZnVuY3Rpb246XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICAgQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICAgICAgICAvLyAgICAgIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvXG4gICAgICAgIC8vICAgICAgZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGVcbiAgICAgICAgLy8gICAgICByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3JcbiAgICAgICAgLy8gICAgICBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICAgICAgICAvLyAgICAgIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAgICAgICAgLy8gICAgICBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gICAgICAgIC8vICAgICAgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gICAgICAgIC8vICAgICAgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gICAgICAgIC8vICAgICAgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICAgICAgICAvLyAgICAgIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HXG4gICAgICAgIC8vICAgICAgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HU1xuICAgICAgICAvLyAgICAgIElOIFRIRSBTT0ZUV0FSRS5cbiAgICAgICAgaWYgKCFhcmcpIHtcbiAgICAgICAgICAgIC8vIE5lZWQgZG91YmxlIHF1b3RhdGlvbiBmb3IgZW1wdHkgYXJndW1lbnRcbiAgICAgICAgICAgIHJldHVybiAnXCJcIic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhcmcuaW5jbHVkZXMoJyAnKSAmJiAhYXJnLmluY2x1ZGVzKCdcXHQnKSAmJiAhYXJnLmluY2x1ZGVzKCdcIicpKSB7XG4gICAgICAgICAgICAvLyBObyBxdW90YXRpb24gbmVlZGVkXG4gICAgICAgICAgICByZXR1cm4gYXJnO1xuICAgICAgICB9XG4gICAgICAgIGlmICghYXJnLmluY2x1ZGVzKCdcIicpICYmICFhcmcuaW5jbHVkZXMoJ1xcXFwnKSkge1xuICAgICAgICAgICAgLy8gTm8gZW1iZWRkZWQgZG91YmxlIHF1b3RlcyBvciBiYWNrc2xhc2hlcywgc28gSSBjYW4ganVzdCB3cmFwXG4gICAgICAgICAgICAvLyBxdW90ZSBtYXJrcyBhcm91bmQgdGhlIHdob2xlIHRoaW5nLlxuICAgICAgICAgICAgcmV0dXJuIGBcIiR7YXJnfVwiYDtcbiAgICAgICAgfVxuICAgICAgICAvLyBFeHBlY3RlZCBpbnB1dC9vdXRwdXQ6XG4gICAgICAgIC8vICAgaW5wdXQgOiBoZWxsb1wid29ybGRcbiAgICAgICAgLy8gICBvdXRwdXQ6IFwiaGVsbG9cXFwid29ybGRcIlxuICAgICAgICAvLyAgIGlucHV0IDogaGVsbG9cIlwid29ybGRcbiAgICAgICAgLy8gICBvdXRwdXQ6IFwiaGVsbG9cXFwiXFxcIndvcmxkXCJcbiAgICAgICAgLy8gICBpbnB1dCA6IGhlbGxvXFx3b3JsZFxuICAgICAgICAvLyAgIG91dHB1dDogaGVsbG9cXHdvcmxkXG4gICAgICAgIC8vICAgaW5wdXQgOiBoZWxsb1xcXFx3b3JsZFxuICAgICAgICAvLyAgIG91dHB1dDogaGVsbG9cXFxcd29ybGRcbiAgICAgICAgLy8gICBpbnB1dCA6IGhlbGxvXFxcIndvcmxkXG4gICAgICAgIC8vICAgb3V0cHV0OiBcImhlbGxvXFxcXFxcXCJ3b3JsZFwiXG4gICAgICAgIC8vICAgaW5wdXQgOiBoZWxsb1xcXFxcIndvcmxkXG4gICAgICAgIC8vICAgb3V0cHV0OiBcImhlbGxvXFxcXFxcXFxcXFwid29ybGRcIlxuICAgICAgICAvLyAgIGlucHV0IDogaGVsbG8gd29ybGRcXFxuICAgICAgICAvLyAgIG91dHB1dDogXCJoZWxsbyB3b3JsZFxcXFxcIiAtIG5vdGUgdGhlIGNvbW1lbnQgaW4gbGlidXYgYWN0dWFsbHkgcmVhZHMgXCJoZWxsbyB3b3JsZFxcXCJcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1dCBpdCBhcHBlYXJzIHRoZSBjb21tZW50IGlzIHdyb25nLCBpdCBzaG91bGQgYmUgXCJoZWxsbyB3b3JsZFxcXFxcIlxuICAgICAgICBsZXQgcmV2ZXJzZSA9ICdcIic7XG4gICAgICAgIGxldCBxdW90ZUhpdCA9IHRydWU7XG4gICAgICAgIGZvciAobGV0IGkgPSBhcmcubGVuZ3RoOyBpID4gMDsgaS0tKSB7XG4gICAgICAgICAgICAvLyB3YWxrIHRoZSBzdHJpbmcgaW4gcmV2ZXJzZVxuICAgICAgICAgICAgcmV2ZXJzZSArPSBhcmdbaSAtIDFdO1xuICAgICAgICAgICAgaWYgKHF1b3RlSGl0ICYmIGFyZ1tpIC0gMV0gPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgIHJldmVyc2UgKz0gJ1xcXFwnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoYXJnW2kgLSAxXSA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICAgIHF1b3RlSGl0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXZlcnNlICs9ICdcXFxcJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHF1b3RlSGl0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV2ZXJzZSArPSAnXCInO1xuICAgICAgICByZXR1cm4gcmV2ZXJzZVxuICAgICAgICAgICAgLnNwbGl0KCcnKVxuICAgICAgICAgICAgLnJldmVyc2UoKVxuICAgICAgICAgICAgLmpvaW4oJycpO1xuICAgIH1cbiAgICBfY2xvbmVFeGVjT3B0aW9ucyhvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICBjd2Q6IG9wdGlvbnMuY3dkIHx8IHByb2Nlc3MuY3dkKCksXG4gICAgICAgICAgICBlbnY6IG9wdGlvbnMuZW52IHx8IHByb2Nlc3MuZW52LFxuICAgICAgICAgICAgc2lsZW50OiBvcHRpb25zLnNpbGVudCB8fCBmYWxzZSxcbiAgICAgICAgICAgIHdpbmRvd3NWZXJiYXRpbUFyZ3VtZW50czogb3B0aW9ucy53aW5kb3dzVmVyYmF0aW1Bcmd1bWVudHMgfHwgZmFsc2UsXG4gICAgICAgICAgICBmYWlsT25TdGRFcnI6IG9wdGlvbnMuZmFpbE9uU3RkRXJyIHx8IGZhbHNlLFxuICAgICAgICAgICAgaWdub3JlUmV0dXJuQ29kZTogb3B0aW9ucy5pZ25vcmVSZXR1cm5Db2RlIHx8IGZhbHNlLFxuICAgICAgICAgICAgZGVsYXk6IG9wdGlvbnMuZGVsYXkgfHwgMTAwMDBcbiAgICAgICAgfTtcbiAgICAgICAgcmVzdWx0Lm91dFN0cmVhbSA9IG9wdGlvbnMub3V0U3RyZWFtIHx8IHByb2Nlc3Muc3Rkb3V0O1xuICAgICAgICByZXN1bHQuZXJyU3RyZWFtID0gb3B0aW9ucy5lcnJTdHJlYW0gfHwgcHJvY2Vzcy5zdGRlcnI7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIF9nZXRTcGF3bk9wdGlvbnMob3B0aW9ucywgdG9vbFBhdGgpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHt9O1xuICAgICAgICByZXN1bHQuY3dkID0gb3B0aW9ucy5jd2Q7XG4gICAgICAgIHJlc3VsdC5lbnYgPSBvcHRpb25zLmVudjtcbiAgICAgICAgcmVzdWx0Wyd3aW5kb3dzVmVyYmF0aW1Bcmd1bWVudHMnXSA9XG4gICAgICAgICAgICBvcHRpb25zLndpbmRvd3NWZXJiYXRpbUFyZ3VtZW50cyB8fCB0aGlzLl9pc0NtZEZpbGUoKTtcbiAgICAgICAgaWYgKG9wdGlvbnMud2luZG93c1ZlcmJhdGltQXJndW1lbnRzKSB7XG4gICAgICAgICAgICByZXN1bHQuYXJndjAgPSBgXCIke3Rvb2xQYXRofVwiYDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFeGVjIGEgdG9vbC5cbiAgICAgKiBPdXRwdXQgd2lsbCBiZSBzdHJlYW1lZCB0byB0aGUgbGl2ZSBjb25zb2xlLlxuICAgICAqIFJldHVybnMgcHJvbWlzZSB3aXRoIHJldHVybiBjb2RlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gICAgIHRvb2wgICAgIHBhdGggdG8gdG9vbCB0byBleGVjXG4gICAgICogQHBhcmFtICAgICBvcHRpb25zICBvcHRpb25hbCBleGVjIG9wdGlvbnMuICBTZWUgRXhlY09wdGlvbnNcbiAgICAgKiBAcmV0dXJucyAgIG51bWJlclxuICAgICAqL1xuICAgIGV4ZWMoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICAvLyByb290IHRoZSB0b29sIHBhdGggaWYgaXQgaXMgdW5yb290ZWQgYW5kIGNvbnRhaW5zIHJlbGF0aXZlIHBhdGhpbmdcbiAgICAgICAgICAgIGlmICghaW9VdGlsLmlzUm9vdGVkKHRoaXMudG9vbFBhdGgpICYmXG4gICAgICAgICAgICAgICAgKHRoaXMudG9vbFBhdGguaW5jbHVkZXMoJy8nKSB8fFxuICAgICAgICAgICAgICAgICAgICAoSVNfV0lORE9XUyAmJiB0aGlzLnRvb2xQYXRoLmluY2x1ZGVzKCdcXFxcJykpKSkge1xuICAgICAgICAgICAgICAgIC8vIHByZWZlciBvcHRpb25zLmN3ZCBpZiBpdCBpcyBzcGVjaWZpZWQsIGhvd2V2ZXIgb3B0aW9ucy5jd2QgbWF5IGFsc28gbmVlZCB0byBiZSByb290ZWRcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2xQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIHRoaXMub3B0aW9ucy5jd2QgfHwgcHJvY2Vzcy5jd2QoKSwgdGhpcy50b29sUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpZiB0aGUgdG9vbCBpcyBvbmx5IGEgZmlsZSBuYW1lLCB0aGVuIHJlc29sdmUgaXQgZnJvbSB0aGUgUEFUSFxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHZlcmlmeSBpdCBleGlzdHMgKGFkZCBleHRlbnNpb24gb24gV2luZG93cyBpZiBuZWNlc3NhcnkpXG4gICAgICAgICAgICB0aGlzLnRvb2xQYXRoID0geWllbGQgaW8ud2hpY2godGhpcy50b29sUGF0aCwgdHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBleGVjIHRvb2w6ICR7dGhpcy50b29sUGF0aH1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9kZWJ1ZygnYXJndW1lbnRzOicpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYXJnIG9mIHRoaXMuYXJncykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgICAgJHthcmd9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnNOb25OdWxsID0gdGhpcy5fY2xvbmVFeGVjT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGlmICghb3B0aW9uc05vbk51bGwuc2lsZW50ICYmIG9wdGlvbnNOb25OdWxsLm91dFN0cmVhbSkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zTm9uTnVsbC5vdXRTdHJlYW0ud3JpdGUodGhpcy5fZ2V0Q29tbWFuZFN0cmluZyhvcHRpb25zTm9uTnVsbCkgKyBvcy5FT0wpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZSA9IG5ldyBFeGVjU3RhdGUob3B0aW9uc05vbk51bGwsIHRoaXMudG9vbFBhdGgpO1xuICAgICAgICAgICAgICAgIHN0YXRlLm9uKCdkZWJ1ZycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2RlYnVnKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuY3dkICYmICEoeWllbGQgaW9VdGlsLmV4aXN0cyh0aGlzLm9wdGlvbnMuY3dkKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoYFRoZSBjd2Q6ICR7dGhpcy5vcHRpb25zLmN3ZH0gZG9lcyBub3QgZXhpc3QhYCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHRoaXMuX2dldFNwYXduRmlsZU5hbWUoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjcCA9IGNoaWxkLnNwYXduKGZpbGVOYW1lLCB0aGlzLl9nZXRTcGF3bkFyZ3Mob3B0aW9uc05vbk51bGwpLCB0aGlzLl9nZXRTcGF3bk9wdGlvbnModGhpcy5vcHRpb25zLCBmaWxlTmFtZSkpO1xuICAgICAgICAgICAgICAgIGxldCBzdGRidWZmZXIgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY3Auc3Rkb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNwLnN0ZG91dC5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmxpc3RlbmVycyAmJiB0aGlzLm9wdGlvbnMubGlzdGVuZXJzLnN0ZG91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5saXN0ZW5lcnMuc3Rkb3V0KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zTm9uTnVsbC5zaWxlbnQgJiYgb3B0aW9uc05vbk51bGwub3V0U3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uc05vbk51bGwub3V0U3RyZWFtLndyaXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RkYnVmZmVyID0gdGhpcy5fcHJvY2Vzc0xpbmVCdWZmZXIoZGF0YSwgc3RkYnVmZmVyLCAobGluZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMubGlzdGVuZXJzICYmIHRoaXMub3B0aW9ucy5saXN0ZW5lcnMuc3RkbGluZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubGlzdGVuZXJzLnN0ZGxpbmUobGluZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgZXJyYnVmZmVyID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNwLnN0ZGVycikge1xuICAgICAgICAgICAgICAgICAgICBjcC5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUucHJvY2Vzc1N0ZGVyciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmxpc3RlbmVycyAmJiB0aGlzLm9wdGlvbnMubGlzdGVuZXJzLnN0ZGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5saXN0ZW5lcnMuc3RkZXJyKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zTm9uTnVsbC5zaWxlbnQgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zTm9uTnVsbC5lcnJTdHJlYW0gJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zTm9uTnVsbC5vdXRTdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gb3B0aW9uc05vbk51bGwuZmFpbE9uU3RkRXJyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gb3B0aW9uc05vbk51bGwuZXJyU3RyZWFtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogb3B0aW9uc05vbk51bGwub3V0U3RyZWFtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMud3JpdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJidWZmZXIgPSB0aGlzLl9wcm9jZXNzTGluZUJ1ZmZlcihkYXRhLCBlcnJidWZmZXIsIChsaW5lKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5saXN0ZW5lcnMgJiYgdGhpcy5vcHRpb25zLmxpc3RlbmVycy5lcnJsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5saXN0ZW5lcnMuZXJybGluZShsaW5lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNwLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucHJvY2Vzc0Vycm9yID0gZXJyLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnByb2Nlc3NFeGl0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5wcm9jZXNzQ2xvc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuQ2hlY2tDb21wbGV0ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNwLm9uKCdleGl0JywgKGNvZGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucHJvY2Vzc0V4aXRDb2RlID0gY29kZTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucHJvY2Vzc0V4aXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBFeGl0IGNvZGUgJHtjb2RlfSByZWNlaXZlZCBmcm9tIHRvb2wgJyR7dGhpcy50b29sUGF0aH0nYCk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLkNoZWNrQ29tcGxldGUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBjcC5vbignY2xvc2UnLCAoY29kZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5wcm9jZXNzRXhpdENvZGUgPSBjb2RlO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5wcm9jZXNzRXhpdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucHJvY2Vzc0Nsb3NlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBTVERJTyBzdHJlYW1zIGhhdmUgY2xvc2VkIGZvciB0b29sICcke3RoaXMudG9vbFBhdGh9J2ApO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5DaGVja0NvbXBsZXRlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RhdGUub24oJ2RvbmUnLCAoZXJyb3IsIGV4aXRDb2RlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGRidWZmZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdzdGRsaW5lJywgc3RkYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyYnVmZmVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnZXJybGluZScsIGVycmJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3AucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZXhpdENvZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5pbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWNwLnN0ZGluKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NoaWxkIHByb2Nlc3MgbWlzc2luZyBzdGRpbicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNwLnN0ZGluLmVuZCh0aGlzLm9wdGlvbnMuaW5wdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5Ub29sUnVubmVyID0gVG9vbFJ1bm5lcjtcbi8qKlxuICogQ29udmVydCBhbiBhcmcgc3RyaW5nIHRvIGFuIGFycmF5IG9mIGFyZ3MuIEhhbmRsZXMgZXNjYXBpbmdcbiAqXG4gKiBAcGFyYW0gICAgYXJnU3RyaW5nICAgc3RyaW5nIG9mIGFyZ3VtZW50c1xuICogQHJldHVybnMgIHN0cmluZ1tdICAgIGFycmF5IG9mIGFyZ3VtZW50c1xuICovXG5mdW5jdGlvbiBhcmdTdHJpbmdUb0FycmF5KGFyZ1N0cmluZykge1xuICAgIGNvbnN0IGFyZ3MgPSBbXTtcbiAgICBsZXQgaW5RdW90ZXMgPSBmYWxzZTtcbiAgICBsZXQgZXNjYXBlZCA9IGZhbHNlO1xuICAgIGxldCBhcmcgPSAnJztcbiAgICBmdW5jdGlvbiBhcHBlbmQoYykge1xuICAgICAgICAvLyB3ZSBvbmx5IGVzY2FwZSBkb3VibGUgcXVvdGVzLlxuICAgICAgICBpZiAoZXNjYXBlZCAmJiBjICE9PSAnXCInKSB7XG4gICAgICAgICAgICBhcmcgKz0gJ1xcXFwnO1xuICAgICAgICB9XG4gICAgICAgIGFyZyArPSBjO1xuICAgICAgICBlc2NhcGVkID0gZmFsc2U7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnU3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGMgPSBhcmdTdHJpbmcuY2hhckF0KGkpO1xuICAgICAgICBpZiAoYyA9PT0gJ1wiJykge1xuICAgICAgICAgICAgaWYgKCFlc2NhcGVkKSB7XG4gICAgICAgICAgICAgICAgaW5RdW90ZXMgPSAhaW5RdW90ZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcHBlbmQoYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYyA9PT0gJ1xcXFwnICYmIGVzY2FwZWQpIHtcbiAgICAgICAgICAgIGFwcGVuZChjKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjID09PSAnXFxcXCcgJiYgaW5RdW90ZXMpIHtcbiAgICAgICAgICAgIGVzY2FwZWQgPSB0cnVlO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGMgPT09ICcgJyAmJiAhaW5RdW90ZXMpIHtcbiAgICAgICAgICAgIGlmIChhcmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaChhcmcpO1xuICAgICAgICAgICAgICAgIGFyZyA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYXBwZW5kKGMpO1xuICAgIH1cbiAgICBpZiAoYXJnLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYXJncy5wdXNoKGFyZy50cmltKCkpO1xuICAgIH1cbiAgICByZXR1cm4gYXJncztcbn1cbmV4cG9ydHMuYXJnU3RyaW5nVG9BcnJheSA9IGFyZ1N0cmluZ1RvQXJyYXk7XG5jbGFzcyBFeGVjU3RhdGUgZXh0ZW5kcyBldmVudHMuRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zLCB0b29sUGF0aCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnByb2Nlc3NDbG9zZWQgPSBmYWxzZTsgLy8gdHJhY2tzIHdoZXRoZXIgdGhlIHByb2Nlc3MgaGFzIGV4aXRlZCBhbmQgc3RkaW8gaXMgY2xvc2VkXG4gICAgICAgIHRoaXMucHJvY2Vzc0Vycm9yID0gJyc7XG4gICAgICAgIHRoaXMucHJvY2Vzc0V4aXRDb2RlID0gMDtcbiAgICAgICAgdGhpcy5wcm9jZXNzRXhpdGVkID0gZmFsc2U7IC8vIHRyYWNrcyB3aGV0aGVyIHRoZSBwcm9jZXNzIGhhcyBleGl0ZWRcbiAgICAgICAgdGhpcy5wcm9jZXNzU3RkZXJyID0gZmFsc2U7IC8vIHRyYWNrcyB3aGV0aGVyIHN0ZGVyciB3YXMgd3JpdHRlbiB0b1xuICAgICAgICB0aGlzLmRlbGF5ID0gMTAwMDA7IC8vIDEwIHNlY29uZHNcbiAgICAgICAgdGhpcy5kb25lID0gZmFsc2U7XG4gICAgICAgIHRoaXMudGltZW91dCA9IG51bGw7XG4gICAgICAgIGlmICghdG9vbFBhdGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndG9vbFBhdGggbXVzdCBub3QgYmUgZW1wdHknKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICB0aGlzLnRvb2xQYXRoID0gdG9vbFBhdGg7XG4gICAgICAgIGlmIChvcHRpb25zLmRlbGF5KSB7XG4gICAgICAgICAgICB0aGlzLmRlbGF5ID0gb3B0aW9ucy5kZWxheTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBDaGVja0NvbXBsZXRlKCkge1xuICAgICAgICBpZiAodGhpcy5kb25lKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucHJvY2Vzc0Nsb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5fc2V0UmVzdWx0KCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5wcm9jZXNzRXhpdGVkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVvdXQgPSB0aW1lcnNfMS5zZXRUaW1lb3V0KEV4ZWNTdGF0ZS5IYW5kbGVUaW1lb3V0LCB0aGlzLmRlbGF5LCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBfZGVidWcobWVzc2FnZSkge1xuICAgICAgICB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSk7XG4gICAgfVxuICAgIF9zZXRSZXN1bHQoKSB7XG4gICAgICAgIC8vIGRldGVybWluZSB3aGV0aGVyIHRoZXJlIGlzIGFuIGVycm9yXG4gICAgICAgIGxldCBlcnJvcjtcbiAgICAgICAgaWYgKHRoaXMucHJvY2Vzc0V4aXRlZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJvY2Vzc0Vycm9yKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoYFRoZXJlIHdhcyBhbiBlcnJvciB3aGVuIGF0dGVtcHRpbmcgdG8gZXhlY3V0ZSB0aGUgcHJvY2VzcyAnJHt0aGlzLnRvb2xQYXRofScuIFRoaXMgbWF5IGluZGljYXRlIHRoZSBwcm9jZXNzIGZhaWxlZCB0byBzdGFydC4gRXJyb3I6ICR7dGhpcy5wcm9jZXNzRXJyb3J9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLnByb2Nlc3NFeGl0Q29kZSAhPT0gMCAmJiAhdGhpcy5vcHRpb25zLmlnbm9yZVJldHVybkNvZGUpIHtcbiAgICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihgVGhlIHByb2Nlc3MgJyR7dGhpcy50b29sUGF0aH0nIGZhaWxlZCB3aXRoIGV4aXQgY29kZSAke3RoaXMucHJvY2Vzc0V4aXRDb2RlfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5wcm9jZXNzU3RkZXJyICYmIHRoaXMub3B0aW9ucy5mYWlsT25TdGRFcnIpIHtcbiAgICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihgVGhlIHByb2Nlc3MgJyR7dGhpcy50b29sUGF0aH0nIGZhaWxlZCBiZWNhdXNlIG9uZSBvciBtb3JlIGxpbmVzIHdlcmUgd3JpdHRlbiB0byB0aGUgU1RERVJSIHN0cmVhbWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFyIHRoZSB0aW1lb3V0XG4gICAgICAgIGlmICh0aGlzLnRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgdGhpcy50aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRvbmUgPSB0cnVlO1xuICAgICAgICB0aGlzLmVtaXQoJ2RvbmUnLCBlcnJvciwgdGhpcy5wcm9jZXNzRXhpdENvZGUpO1xuICAgIH1cbiAgICBzdGF0aWMgSGFuZGxlVGltZW91dChzdGF0ZSkge1xuICAgICAgICBpZiAoc3RhdGUuZG9uZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc3RhdGUucHJvY2Vzc0Nsb3NlZCAmJiBzdGF0ZS5wcm9jZXNzRXhpdGVkKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYFRoZSBTVERJTyBzdHJlYW1zIGRpZCBub3QgY2xvc2Ugd2l0aGluICR7c3RhdGUuZGVsYXkgL1xuICAgICAgICAgICAgICAgIDEwMDB9IHNlY29uZHMgb2YgdGhlIGV4aXQgZXZlbnQgZnJvbSBwcm9jZXNzICcke3N0YXRlLnRvb2xQYXRofScuIFRoaXMgbWF5IGluZGljYXRlIGEgY2hpbGQgcHJvY2VzcyBpbmhlcml0ZWQgdGhlIFNURElPIHN0cmVhbXMgYW5kIGhhcyBub3QgeWV0IGV4aXRlZC5gO1xuICAgICAgICAgICAgc3RhdGUuX2RlYnVnKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLl9zZXRSZXN1bHQoKTtcbiAgICB9XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD10b29scnVubmVyLmpzLm1hcCIsCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfSk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xufSk7XG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmdldEV4ZWNPdXRwdXQgPSBleHBvcnRzLmV4ZWMgPSB2b2lkIDA7XG5jb25zdCBzdHJpbmdfZGVjb2Rlcl8xID0gcmVxdWlyZShcInN0cmluZ19kZWNvZGVyXCIpO1xuY29uc3QgdHIgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcIi4vdG9vbHJ1bm5lclwiKSk7XG4vKipcbiAqIEV4ZWMgYSBjb21tYW5kLlxuICogT3V0cHV0IHdpbGwgYmUgc3RyZWFtZWQgdG8gdGhlIGxpdmUgY29uc29sZS5cbiAqIFJldHVybnMgcHJvbWlzZSB3aXRoIHJldHVybiBjb2RlXG4gKlxuICogQHBhcmFtICAgICBjb21tYW5kTGluZSAgICAgICAgY29tbWFuZCB0byBleGVjdXRlIChjYW4gaW5jbHVkZSBhZGRpdGlvbmFsIGFyZ3MpLiBNdXN0IGJlIGNvcnJlY3RseSBlc2NhcGVkLlxuICogQHBhcmFtICAgICBhcmdzICAgICAgICAgICAgICAgb3B0aW9uYWwgYXJndW1lbnRzIGZvciB0b29sLiBFc2NhcGluZyBpcyBoYW5kbGVkIGJ5IHRoZSBsaWIuXG4gKiBAcGFyYW0gICAgIG9wdGlvbnMgICAgICAgICAgICBvcHRpb25hbCBleGVjIG9wdGlvbnMuICBTZWUgRXhlY09wdGlvbnNcbiAqIEByZXR1cm5zICAgUHJvbWlzZTxudW1iZXI+ICAgIGV4aXQgY29kZVxuICovXG5mdW5jdGlvbiBleGVjKGNvbW1hbmRMaW5lLCBhcmdzLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgY29uc3QgY29tbWFuZEFyZ3MgPSB0ci5hcmdTdHJpbmdUb0FycmF5KGNvbW1hbmRMaW5lKTtcbiAgICAgICAgaWYgKGNvbW1hbmRBcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYXJhbWV0ZXIgJ2NvbW1hbmRMaW5lJyBjYW5ub3QgYmUgbnVsbCBvciBlbXB0eS5gKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBQYXRoIHRvIHRvb2wgdG8gZXhlY3V0ZSBzaG91bGQgYmUgZmlyc3QgYXJnXG4gICAgICAgIGNvbnN0IHRvb2xQYXRoID0gY29tbWFuZEFyZ3NbMF07XG4gICAgICAgIGFyZ3MgPSBjb21tYW5kQXJncy5zbGljZSgxKS5jb25jYXQoYXJncyB8fCBbXSk7XG4gICAgICAgIGNvbnN0IHJ1bm5lciA9IG5ldyB0ci5Ub29sUnVubmVyKHRvb2xQYXRoLCBhcmdzLCBvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHJ1bm5lci5leGVjKCk7XG4gICAgfSk7XG59XG5leHBvcnRzLmV4ZWMgPSBleGVjO1xuLyoqXG4gKiBFeGVjIGEgY29tbWFuZCBhbmQgZ2V0IHRoZSBvdXRwdXQuXG4gKiBPdXRwdXQgd2lsbCBiZSBzdHJlYW1lZCB0byB0aGUgbGl2ZSBjb25zb2xlLlxuICogUmV0dXJucyBwcm9taXNlIHdpdGggdGhlIGV4aXQgY29kZSBhbmQgY29sbGVjdGVkIHN0ZG91dCBhbmQgc3RkZXJyXG4gKlxuICogQHBhcmFtICAgICBjb21tYW5kTGluZSAgICAgICAgICAgY29tbWFuZCB0byBleGVjdXRlIChjYW4gaW5jbHVkZSBhZGRpdGlvbmFsIGFyZ3MpLiBNdXN0IGJlIGNvcnJlY3RseSBlc2NhcGVkLlxuICogQHBhcmFtICAgICBhcmdzICAgICAgICAgICAgICAgICAgb3B0aW9uYWwgYXJndW1lbnRzIGZvciB0b29sLiBFc2NhcGluZyBpcyBoYW5kbGVkIGJ5IHRoZSBsaWIuXG4gKiBAcGFyYW0gICAgIG9wdGlvbnMgICAgICAgICAgICAgICBvcHRpb25hbCBleGVjIG9wdGlvbnMuICBTZWUgRXhlY09wdGlvbnNcbiAqIEByZXR1cm5zICAgUHJvbWlzZTxFeGVjT3V0cHV0PiAgIGV4aXQgY29kZSwgc3Rkb3V0LCBhbmQgc3RkZXJyXG4gKi9cbmZ1bmN0aW9uIGdldEV4ZWNPdXRwdXQoY29tbWFuZExpbmUsIGFyZ3MsIG9wdGlvbnMpIHtcbiAgICB2YXIgX2EsIF9iO1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGxldCBzdGRvdXQgPSAnJztcbiAgICAgICAgbGV0IHN0ZGVyciA9ICcnO1xuICAgICAgICAvL1VzaW5nIHN0cmluZyBkZWNvZGVyIGNvdmVycyB0aGUgY2FzZSB3aGVyZSBhIG11bHQtYnl0ZSBjaGFyYWN0ZXIgaXMgc3BsaXRcbiAgICAgICAgY29uc3Qgc3Rkb3V0RGVjb2RlciA9IG5ldyBzdHJpbmdfZGVjb2Rlcl8xLlN0cmluZ0RlY29kZXIoJ3V0ZjgnKTtcbiAgICAgICAgY29uc3Qgc3RkZXJyRGVjb2RlciA9IG5ldyBzdHJpbmdfZGVjb2Rlcl8xLlN0cmluZ0RlY29kZXIoJ3V0ZjgnKTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxTdGRvdXRMaXN0ZW5lciA9IChfYSA9IG9wdGlvbnMgPT09IG51bGwgfHwgb3B0aW9ucyA9PT0gdm9pZCAwID8gdm9pZCAwIDogb3B0aW9ucy5saXN0ZW5lcnMpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5zdGRvdXQ7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsU3RkRXJyTGlzdGVuZXIgPSAoX2IgPSBvcHRpb25zID09PSBudWxsIHx8IG9wdGlvbnMgPT09IHZvaWQgMCA/IHZvaWQgMCA6IG9wdGlvbnMubGlzdGVuZXJzKSA9PT0gbnVsbCB8fCBfYiA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2Iuc3RkZXJyO1xuICAgICAgICBjb25zdCBzdGRFcnJMaXN0ZW5lciA9IChkYXRhKSA9PiB7XG4gICAgICAgICAgICBzdGRlcnIgKz0gc3RkZXJyRGVjb2Rlci53cml0ZShkYXRhKTtcbiAgICAgICAgICAgIGlmIChvcmlnaW5hbFN0ZEVyckxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWxTdGRFcnJMaXN0ZW5lcihkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc3RkT3V0TGlzdGVuZXIgPSAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgc3Rkb3V0ICs9IHN0ZG91dERlY29kZXIud3JpdGUoZGF0YSk7XG4gICAgICAgICAgICBpZiAob3JpZ2luYWxTdGRvdXRMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsU3Rkb3V0TGlzdGVuZXIoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGxpc3RlbmVycyA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyA9PT0gbnVsbCB8fCBvcHRpb25zID09PSB2b2lkIDAgPyB2b2lkIDAgOiBvcHRpb25zLmxpc3RlbmVycyksIHsgc3Rkb3V0OiBzdGRPdXRMaXN0ZW5lciwgc3RkZXJyOiBzdGRFcnJMaXN0ZW5lciB9KTtcbiAgICAgICAgY29uc3QgZXhpdENvZGUgPSB5aWVsZCBleGVjKGNvbW1hbmRMaW5lLCBhcmdzLCBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpLCB7IGxpc3RlbmVycyB9KSk7XG4gICAgICAgIC8vZmx1c2ggYW55IHJlbWFpbmluZyBjaGFyYWN0ZXJzXG4gICAgICAgIHN0ZG91dCArPSBzdGRvdXREZWNvZGVyLmVuZCgpO1xuICAgICAgICBzdGRlcnIgKz0gc3RkZXJyRGVjb2Rlci5lbmQoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGV4aXRDb2RlLFxuICAgICAgICAgICAgc3Rkb3V0LFxuICAgICAgICAgICAgc3RkZXJyXG4gICAgICAgIH07XG4gICAgfSk7XG59XG5leHBvcnRzLmdldEV4ZWNPdXRwdXQgPSBnZXRFeGVjT3V0cHV0O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZXhlYy5qcy5tYXAiLAogICAgIlwidXNlIHN0cmljdFwiO1xuLy8gV2UgdXNlIGFueSBhcyBhIHZhbGlkIGlucHV0IHR5cGVcbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMudG9Db21tYW5kUHJvcGVydGllcyA9IGV4cG9ydHMudG9Db21tYW5kVmFsdWUgPSB2b2lkIDA7XG4vKipcbiAqIFNhbml0aXplcyBhbiBpbnB1dCBpbnRvIGEgc3RyaW5nIHNvIGl0IGNhbiBiZSBwYXNzZWQgaW50byBpc3N1ZUNvbW1hbmQgc2FmZWx5XG4gKiBAcGFyYW0gaW5wdXQgaW5wdXQgdG8gc2FuaXRpemUgaW50byBhIHN0cmluZ1xuICovXG5mdW5jdGlvbiB0b0NvbW1hbmRWYWx1ZShpbnB1dCkge1xuICAgIGlmIChpbnB1dCA9PT0gbnVsbCB8fCBpbnB1dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyB8fCBpbnB1dCBpbnN0YW5jZW9mIFN0cmluZykge1xuICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgfVxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShpbnB1dCk7XG59XG5leHBvcnRzLnRvQ29tbWFuZFZhbHVlID0gdG9Db21tYW5kVmFsdWU7XG4vKipcbiAqXG4gKiBAcGFyYW0gYW5ub3RhdGlvblByb3BlcnRpZXNcbiAqIEByZXR1cm5zIFRoZSBjb21tYW5kIHByb3BlcnRpZXMgdG8gc2VuZCB3aXRoIHRoZSBhY3R1YWwgYW5ub3RhdGlvbiBjb21tYW5kXG4gKiBTZWUgSXNzdWVDb21tYW5kUHJvcGVydGllczogaHR0cHM6Ly9naXRodWIuY29tL2FjdGlvbnMvcnVubmVyL2Jsb2IvbWFpbi9zcmMvUnVubmVyLldvcmtlci9BY3Rpb25Db21tYW5kTWFuYWdlci5jcyNMNjQ2XG4gKi9cbmZ1bmN0aW9uIHRvQ29tbWFuZFByb3BlcnRpZXMoYW5ub3RhdGlvblByb3BlcnRpZXMpIHtcbiAgICBpZiAoIU9iamVjdC5rZXlzKGFubm90YXRpb25Qcm9wZXJ0aWVzKS5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICB0aXRsZTogYW5ub3RhdGlvblByb3BlcnRpZXMudGl0bGUsXG4gICAgICAgIGZpbGU6IGFubm90YXRpb25Qcm9wZXJ0aWVzLmZpbGUsXG4gICAgICAgIGxpbmU6IGFubm90YXRpb25Qcm9wZXJ0aWVzLnN0YXJ0TGluZSxcbiAgICAgICAgZW5kTGluZTogYW5ub3RhdGlvblByb3BlcnRpZXMuZW5kTGluZSxcbiAgICAgICAgY29sOiBhbm5vdGF0aW9uUHJvcGVydGllcy5zdGFydENvbHVtbixcbiAgICAgICAgZW5kQ29sdW1uOiBhbm5vdGF0aW9uUHJvcGVydGllcy5lbmRDb2x1bW5cbiAgICB9O1xufVxuZXhwb3J0cy50b0NvbW1hbmRQcm9wZXJ0aWVzID0gdG9Db21tYW5kUHJvcGVydGllcztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXV0aWxzLmpzLm1hcCIsCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XG4gICAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcbiAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xufSk7XG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuaXNzdWUgPSBleHBvcnRzLmlzc3VlQ29tbWFuZCA9IHZvaWQgMDtcbmNvbnN0IG9zID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJvc1wiKSk7XG5jb25zdCB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG4vKipcbiAqIENvbW1hbmRzXG4gKlxuICogQ29tbWFuZCBGb3JtYXQ6XG4gKiAgIDo6bmFtZSBrZXk9dmFsdWUsa2V5PXZhbHVlOjptZXNzYWdlXG4gKlxuICogRXhhbXBsZXM6XG4gKiAgIDo6d2FybmluZzo6VGhpcyBpcyB0aGUgbWVzc2FnZVxuICogICA6OnNldC1lbnYgbmFtZT1NWV9WQVI6OnNvbWUgdmFsdWVcbiAqL1xuZnVuY3Rpb24gaXNzdWVDb21tYW5kKGNvbW1hbmQsIHByb3BlcnRpZXMsIG1lc3NhZ2UpIHtcbiAgICBjb25zdCBjbWQgPSBuZXcgQ29tbWFuZChjb21tYW5kLCBwcm9wZXJ0aWVzLCBtZXNzYWdlKTtcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShjbWQudG9TdHJpbmcoKSArIG9zLkVPTCk7XG59XG5leHBvcnRzLmlzc3VlQ29tbWFuZCA9IGlzc3VlQ29tbWFuZDtcbmZ1bmN0aW9uIGlzc3VlKG5hbWUsIG1lc3NhZ2UgPSAnJykge1xuICAgIGlzc3VlQ29tbWFuZChuYW1lLCB7fSwgbWVzc2FnZSk7XG59XG5leHBvcnRzLmlzc3VlID0gaXNzdWU7XG5jb25zdCBDTURfU1RSSU5HID0gJzo6JztcbmNsYXNzIENvbW1hbmQge1xuICAgIGNvbnN0cnVjdG9yKGNvbW1hbmQsIHByb3BlcnRpZXMsIG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFjb21tYW5kKSB7XG4gICAgICAgICAgICBjb21tYW5kID0gJ21pc3NpbmcuY29tbWFuZCc7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb21tYW5kID0gY29tbWFuZDtcbiAgICAgICAgdGhpcy5wcm9wZXJ0aWVzID0gcHJvcGVydGllcztcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICB9XG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIGxldCBjbWRTdHIgPSBDTURfU1RSSU5HICsgdGhpcy5jb21tYW5kO1xuICAgICAgICBpZiAodGhpcy5wcm9wZXJ0aWVzICYmIE9iamVjdC5rZXlzKHRoaXMucHJvcGVydGllcykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY21kU3RyICs9ICcgJztcbiAgICAgICAgICAgIGxldCBmaXJzdCA9IHRydWU7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gdGhpcy5wcm9wZXJ0aWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaXJzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbWRTdHIgKz0gJywnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY21kU3RyICs9IGAke2tleX09JHtlc2NhcGVQcm9wZXJ0eSh2YWwpfWA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY21kU3RyICs9IGAke0NNRF9TVFJJTkd9JHtlc2NhcGVEYXRhKHRoaXMubWVzc2FnZSl9YDtcbiAgICAgICAgcmV0dXJuIGNtZFN0cjtcbiAgICB9XG59XG5mdW5jdGlvbiBlc2NhcGVEYXRhKHMpIHtcbiAgICByZXR1cm4gKDAsIHV0aWxzXzEudG9Db21tYW5kVmFsdWUpKHMpXG4gICAgICAgIC5yZXBsYWNlKC8lL2csICclMjUnKVxuICAgICAgICAucmVwbGFjZSgvXFxyL2csICclMEQnKVxuICAgICAgICAucmVwbGFjZSgvXFxuL2csICclMEEnKTtcbn1cbmZ1bmN0aW9uIGVzY2FwZVByb3BlcnR5KHMpIHtcbiAgICByZXR1cm4gKDAsIHV0aWxzXzEudG9Db21tYW5kVmFsdWUpKHMpXG4gICAgICAgIC5yZXBsYWNlKC8lL2csICclMjUnKVxuICAgICAgICAucmVwbGFjZSgvXFxyL2csICclMEQnKVxuICAgICAgICAucmVwbGFjZSgvXFxuL2csICclMEEnKVxuICAgICAgICAucmVwbGFjZSgvOi9nLCAnJTNBJylcbiAgICAgICAgLnJlcGxhY2UoLywvZywgJyUyQycpO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29tbWFuZC5qcy5tYXAiLAogICAgIlwidXNlIHN0cmljdFwiO1xuLy8gRm9yIGludGVybmFsIHVzZSwgc3ViamVjdCB0byBjaGFuZ2UuXG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XG4gICAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcbiAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xufSk7XG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMucHJlcGFyZUtleVZhbHVlTWVzc2FnZSA9IGV4cG9ydHMuaXNzdWVGaWxlQ29tbWFuZCA9IHZvaWQgMDtcbi8vIFdlIHVzZSBhbnkgYXMgYSB2YWxpZCBpbnB1dCB0eXBlXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5jb25zdCBjcnlwdG8gPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcImNyeXB0b1wiKSk7XG5jb25zdCBmcyA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwiZnNcIikpO1xuY29uc3Qgb3MgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcIm9zXCIpKTtcbmNvbnN0IHV0aWxzXzEgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbmZ1bmN0aW9uIGlzc3VlRmlsZUNvbW1hbmQoY29tbWFuZCwgbWVzc2FnZSkge1xuICAgIGNvbnN0IGZpbGVQYXRoID0gcHJvY2Vzcy5lbnZbYEdJVEhVQl8ke2NvbW1hbmR9YF07XG4gICAgaWYgKCFmaWxlUGF0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBmaW5kIGVudmlyb25tZW50IHZhcmlhYmxlIGZvciBmaWxlIGNvbW1hbmQgJHtjb21tYW5kfWApO1xuICAgIH1cbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBmaWxlIGF0IHBhdGg6ICR7ZmlsZVBhdGh9YCk7XG4gICAgfVxuICAgIGZzLmFwcGVuZEZpbGVTeW5jKGZpbGVQYXRoLCBgJHsoMCwgdXRpbHNfMS50b0NvbW1hbmRWYWx1ZSkobWVzc2FnZSl9JHtvcy5FT0x9YCwge1xuICAgICAgICBlbmNvZGluZzogJ3V0ZjgnXG4gICAgfSk7XG59XG5leHBvcnRzLmlzc3VlRmlsZUNvbW1hbmQgPSBpc3N1ZUZpbGVDb21tYW5kO1xuZnVuY3Rpb24gcHJlcGFyZUtleVZhbHVlTWVzc2FnZShrZXksIHZhbHVlKSB7XG4gICAgY29uc3QgZGVsaW1pdGVyID0gYGdoYWRlbGltaXRlcl8ke2NyeXB0by5yYW5kb21VVUlEKCl9YDtcbiAgICBjb25zdCBjb252ZXJ0ZWRWYWx1ZSA9ICgwLCB1dGlsc18xLnRvQ29tbWFuZFZhbHVlKSh2YWx1ZSk7XG4gICAgLy8gVGhlc2Ugc2hvdWxkIHJlYWxpc3RpY2FsbHkgbmV2ZXIgaGFwcGVuLCBidXQganVzdCBpbiBjYXNlIHNvbWVvbmUgZmluZHMgYVxuICAgIC8vIHdheSB0byBleHBsb2l0IHV1aWQgZ2VuZXJhdGlvbiBsZXQncyBub3QgYWxsb3cga2V5cyBvciB2YWx1ZXMgdGhhdCBjb250YWluXG4gICAgLy8gdGhlIGRlbGltaXRlci5cbiAgICBpZiAoa2V5LmluY2x1ZGVzKGRlbGltaXRlcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGlucHV0OiBuYW1lIHNob3VsZCBub3QgY29udGFpbiB0aGUgZGVsaW1pdGVyIFwiJHtkZWxpbWl0ZXJ9XCJgKTtcbiAgICB9XG4gICAgaWYgKGNvbnZlcnRlZFZhbHVlLmluY2x1ZGVzKGRlbGltaXRlcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGlucHV0OiB2YWx1ZSBzaG91bGQgbm90IGNvbnRhaW4gdGhlIGRlbGltaXRlciBcIiR7ZGVsaW1pdGVyfVwiYCk7XG4gICAgfVxuICAgIHJldHVybiBgJHtrZXl9PDwke2RlbGltaXRlcn0ke29zLkVPTH0ke2NvbnZlcnRlZFZhbHVlfSR7b3MuRU9MfSR7ZGVsaW1pdGVyfWA7XG59XG5leHBvcnRzLnByZXBhcmVLZXlWYWx1ZU1lc3NhZ2UgPSBwcmVwYXJlS2V5VmFsdWVNZXNzYWdlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZmlsZS1jb21tYW5kLmpzLm1hcCIsCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuUGVyc29uYWxBY2Nlc3NUb2tlbkNyZWRlbnRpYWxIYW5kbGVyID0gZXhwb3J0cy5CZWFyZXJDcmVkZW50aWFsSGFuZGxlciA9IGV4cG9ydHMuQmFzaWNDcmVkZW50aWFsSGFuZGxlciA9IHZvaWQgMDtcbmNsYXNzIEJhc2ljQ3JlZGVudGlhbEhhbmRsZXIge1xuICAgIGNvbnN0cnVjdG9yKHVzZXJuYW1lLCBwYXNzd29yZCkge1xuICAgICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcm5hbWU7XG4gICAgICAgIHRoaXMucGFzc3dvcmQgPSBwYXNzd29yZDtcbiAgICB9XG4gICAgcHJlcGFyZVJlcXVlc3Qob3B0aW9ucykge1xuICAgICAgICBpZiAoIW9wdGlvbnMuaGVhZGVycykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ1RoZSByZXF1ZXN0IGhhcyBubyBoZWFkZXJzJyk7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy5oZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmFzaWMgJHtCdWZmZXIuZnJvbShgJHt0aGlzLnVzZXJuYW1lfToke3RoaXMucGFzc3dvcmR9YCkudG9TdHJpbmcoJ2Jhc2U2NCcpfWA7XG4gICAgfVxuICAgIC8vIFRoaXMgaGFuZGxlciBjYW5ub3QgaGFuZGxlIDQwMVxuICAgIGNhbkhhbmRsZUF1dGhlbnRpY2F0aW9uKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGhhbmRsZUF1dGhlbnRpY2F0aW9uKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5CYXNpY0NyZWRlbnRpYWxIYW5kbGVyID0gQmFzaWNDcmVkZW50aWFsSGFuZGxlcjtcbmNsYXNzIEJlYXJlckNyZWRlbnRpYWxIYW5kbGVyIHtcbiAgICBjb25zdHJ1Y3Rvcih0b2tlbikge1xuICAgICAgICB0aGlzLnRva2VuID0gdG9rZW47XG4gICAgfVxuICAgIC8vIGN1cnJlbnRseSBpbXBsZW1lbnRzIHByZS1hdXRob3JpemF0aW9uXG4gICAgLy8gVE9ETzogc3VwcG9ydCBwcmVBdXRoID0gZmFsc2Ugd2hlcmUgaXQgaG9va3Mgb24gNDAxXG4gICAgcHJlcGFyZVJlcXVlc3Qob3B0aW9ucykge1xuICAgICAgICBpZiAoIW9wdGlvbnMuaGVhZGVycykge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ1RoZSByZXF1ZXN0IGhhcyBubyBoZWFkZXJzJyk7XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy5oZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy50b2tlbn1gO1xuICAgIH1cbiAgICAvLyBUaGlzIGhhbmRsZXIgY2Fubm90IGhhbmRsZSA0MDFcbiAgICBjYW5IYW5kbGVBdXRoZW50aWNhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBoYW5kbGVBdXRoZW50aWNhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuQmVhcmVyQ3JlZGVudGlhbEhhbmRsZXIgPSBCZWFyZXJDcmVkZW50aWFsSGFuZGxlcjtcbmNsYXNzIFBlcnNvbmFsQWNjZXNzVG9rZW5DcmVkZW50aWFsSGFuZGxlciB7XG4gICAgY29uc3RydWN0b3IodG9rZW4pIHtcbiAgICAgICAgdGhpcy50b2tlbiA9IHRva2VuO1xuICAgIH1cbiAgICAvLyBjdXJyZW50bHkgaW1wbGVtZW50cyBwcmUtYXV0aG9yaXphdGlvblxuICAgIC8vIFRPRE86IHN1cHBvcnQgcHJlQXV0aCA9IGZhbHNlIHdoZXJlIGl0IGhvb2tzIG9uIDQwMVxuICAgIHByZXBhcmVSZXF1ZXN0KG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdUaGUgcmVxdWVzdCBoYXMgbm8gaGVhZGVycycpO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMuaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJhc2ljICR7QnVmZmVyLmZyb20oYFBBVDoke3RoaXMudG9rZW59YCkudG9TdHJpbmcoJ2Jhc2U2NCcpfWA7XG4gICAgfVxuICAgIC8vIFRoaXMgaGFuZGxlciBjYW5ub3QgaGFuZGxlIDQwMVxuICAgIGNhbkhhbmRsZUF1dGhlbnRpY2F0aW9uKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGhhbmRsZUF1dGhlbnRpY2F0aW9uKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5QZXJzb25hbEFjY2Vzc1Rva2VuQ3JlZGVudGlhbEhhbmRsZXIgPSBQZXJzb25hbEFjY2Vzc1Rva2VuQ3JlZGVudGlhbEhhbmRsZXI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1hdXRoLmpzLm1hcCIsCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuT2lkY0NsaWVudCA9IHZvaWQgMDtcbmNvbnN0IGh0dHBfY2xpZW50XzEgPSByZXF1aXJlKFwiQGFjdGlvbnMvaHR0cC1jbGllbnRcIik7XG5jb25zdCBhdXRoXzEgPSByZXF1aXJlKFwiQGFjdGlvbnMvaHR0cC1jbGllbnQvbGliL2F1dGhcIik7XG5jb25zdCBjb3JlXzEgPSByZXF1aXJlKFwiLi9jb3JlXCIpO1xuY2xhc3MgT2lkY0NsaWVudCB7XG4gICAgc3RhdGljIGNyZWF0ZUh0dHBDbGllbnQoYWxsb3dSZXRyeSA9IHRydWUsIG1heFJldHJ5ID0gMTApIHtcbiAgICAgICAgY29uc3QgcmVxdWVzdE9wdGlvbnMgPSB7XG4gICAgICAgICAgICBhbGxvd1JldHJpZXM6IGFsbG93UmV0cnksXG4gICAgICAgICAgICBtYXhSZXRyaWVzOiBtYXhSZXRyeVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gbmV3IGh0dHBfY2xpZW50XzEuSHR0cENsaWVudCgnYWN0aW9ucy9vaWRjLWNsaWVudCcsIFtuZXcgYXV0aF8xLkJlYXJlckNyZWRlbnRpYWxIYW5kbGVyKE9pZGNDbGllbnQuZ2V0UmVxdWVzdFRva2VuKCkpXSwgcmVxdWVzdE9wdGlvbnMpO1xuICAgIH1cbiAgICBzdGF0aWMgZ2V0UmVxdWVzdFRva2VuKCkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHByb2Nlc3MuZW52WydBQ1RJT05TX0lEX1RPS0VOX1JFUVVFU1RfVE9LRU4nXTtcbiAgICAgICAgaWYgKCF0b2tlbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZ2V0IEFDVElPTlNfSURfVE9LRU5fUkVRVUVTVF9UT0tFTiBlbnYgdmFyaWFibGUnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgfVxuICAgIHN0YXRpYyBnZXRJRFRva2VuVXJsKCkge1xuICAgICAgICBjb25zdCBydW50aW1lVXJsID0gcHJvY2Vzcy5lbnZbJ0FDVElPTlNfSURfVE9LRU5fUkVRVUVTVF9VUkwnXTtcbiAgICAgICAgaWYgKCFydW50aW1lVXJsKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBnZXQgQUNUSU9OU19JRF9UT0tFTl9SRVFVRVNUX1VSTCBlbnYgdmFyaWFibGUnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnVudGltZVVybDtcbiAgICB9XG4gICAgc3RhdGljIGdldENhbGwoaWRfdG9rZW5fdXJsKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0dHBjbGllbnQgPSBPaWRjQ2xpZW50LmNyZWF0ZUh0dHBDbGllbnQoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IHlpZWxkIGh0dHBjbGllbnRcbiAgICAgICAgICAgICAgICAuZ2V0SnNvbihpZF90b2tlbl91cmwpXG4gICAgICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBnZXQgSUQgVG9rZW4uIFxcbiBcbiAgICAgICAgRXJyb3IgQ29kZSA6ICR7ZXJyb3Iuc3RhdHVzQ29kZX1cXG4gXG4gICAgICAgIEVycm9yIE1lc3NhZ2U6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgaWRfdG9rZW4gPSAoX2EgPSByZXMucmVzdWx0KSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EudmFsdWU7XG4gICAgICAgICAgICBpZiAoIWlkX3Rva2VuKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXNwb25zZSBqc29uIGJvZHkgZG8gbm90IGhhdmUgSUQgVG9rZW4gZmllbGQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpZF90b2tlbjtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHN0YXRpYyBnZXRJRFRva2VuKGF1ZGllbmNlKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIE5ldyBJRCBUb2tlbiBpcyByZXF1ZXN0ZWQgZnJvbSBhY3Rpb24gc2VydmljZVxuICAgICAgICAgICAgICAgIGxldCBpZF90b2tlbl91cmwgPSBPaWRjQ2xpZW50LmdldElEVG9rZW5VcmwoKTtcbiAgICAgICAgICAgICAgICBpZiAoYXVkaWVuY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5jb2RlZEF1ZGllbmNlID0gZW5jb2RlVVJJQ29tcG9uZW50KGF1ZGllbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgaWRfdG9rZW5fdXJsID0gYCR7aWRfdG9rZW5fdXJsfSZhdWRpZW5jZT0ke2VuY29kZWRBdWRpZW5jZX1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAoMCwgY29yZV8xLmRlYnVnKShgSUQgdG9rZW4gdXJsIGlzICR7aWRfdG9rZW5fdXJsfWApO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlkX3Rva2VuID0geWllbGQgT2lkY0NsaWVudC5nZXRDYWxsKGlkX3Rva2VuX3VybCk7XG4gICAgICAgICAgICAgICAgKDAsIGNvcmVfMS5zZXRTZWNyZXQpKGlkX3Rva2VuKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaWRfdG9rZW47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIG1lc3NhZ2U6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0cy5PaWRjQ2xpZW50ID0gT2lkY0NsaWVudDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW9pZGMtdXRpbHMuanMubWFwIiwKICAgICJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5zdW1tYXJ5ID0gZXhwb3J0cy5tYXJrZG93blN1bW1hcnkgPSBleHBvcnRzLlNVTU1BUllfRE9DU19VUkwgPSBleHBvcnRzLlNVTU1BUllfRU5WX1ZBUiA9IHZvaWQgMDtcbmNvbnN0IG9zXzEgPSByZXF1aXJlKFwib3NcIik7XG5jb25zdCBmc18xID0gcmVxdWlyZShcImZzXCIpO1xuY29uc3QgeyBhY2Nlc3MsIGFwcGVuZEZpbGUsIHdyaXRlRmlsZSB9ID0gZnNfMS5wcm9taXNlcztcbmV4cG9ydHMuU1VNTUFSWV9FTlZfVkFSID0gJ0dJVEhVQl9TVEVQX1NVTU1BUlknO1xuZXhwb3J0cy5TVU1NQVJZX0RPQ1NfVVJMID0gJ2h0dHBzOi8vZG9jcy5naXRodWIuY29tL2FjdGlvbnMvdXNpbmctd29ya2Zsb3dzL3dvcmtmbG93LWNvbW1hbmRzLWZvci1naXRodWItYWN0aW9ucyNhZGRpbmctYS1qb2Itc3VtbWFyeSc7XG5jbGFzcyBTdW1tYXJ5IHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5fYnVmZmVyID0gJyc7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZpbmRzIHRoZSBzdW1tYXJ5IGZpbGUgcGF0aCBmcm9tIHRoZSBlbnZpcm9ubWVudCwgcmVqZWN0cyBpZiBlbnYgdmFyIGlzIG5vdCBmb3VuZCBvciBmaWxlIGRvZXMgbm90IGV4aXN0XG4gICAgICogQWxzbyBjaGVja3Mgci93IHBlcm1pc3Npb25zLlxuICAgICAqXG4gICAgICogQHJldHVybnMgc3RlcCBzdW1tYXJ5IGZpbGUgcGF0aFxuICAgICAqL1xuICAgIGZpbGVQYXRoKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2ZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZpbGVQYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcGF0aEZyb21FbnYgPSBwcm9jZXNzLmVudltleHBvcnRzLlNVTU1BUllfRU5WX1ZBUl07XG4gICAgICAgICAgICBpZiAoIXBhdGhGcm9tRW52KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZmluZCBlbnZpcm9ubWVudCB2YXJpYWJsZSBmb3IgJCR7ZXhwb3J0cy5TVU1NQVJZX0VOVl9WQVJ9LiBDaGVjayBpZiB5b3VyIHJ1bnRpbWUgZW52aXJvbm1lbnQgc3VwcG9ydHMgam9iIHN1bW1hcmllcy5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgeWllbGQgYWNjZXNzKHBhdGhGcm9tRW52LCBmc18xLmNvbnN0YW50cy5SX09LIHwgZnNfMS5jb25zdGFudHMuV19PSyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoX2EpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBhY2Nlc3Mgc3VtbWFyeSBmaWxlOiAnJHtwYXRoRnJvbUVudn0nLiBDaGVjayBpZiB0aGUgZmlsZSBoYXMgY29ycmVjdCByZWFkL3dyaXRlIHBlcm1pc3Npb25zLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fZmlsZVBhdGggPSBwYXRoRnJvbUVudjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9maWxlUGF0aDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdyYXBzIGNvbnRlbnQgaW4gYW4gSFRNTCB0YWcsIGFkZGluZyBhbnkgSFRNTCBhdHRyaWJ1dGVzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGFnIEhUTUwgdGFnIHRvIHdyYXBcbiAgICAgKiBAcGFyYW0ge3N0cmluZyB8IG51bGx9IGNvbnRlbnQgY29udGVudCB3aXRoaW4gdGhlIHRhZ1xuICAgICAqIEBwYXJhbSB7W2F0dHJpYnV0ZTogc3RyaW5nXTogc3RyaW5nfSBhdHRycyBrZXktdmFsdWUgbGlzdCBvZiBIVE1MIGF0dHJpYnV0ZXMgdG8gYWRkXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBjb250ZW50IHdyYXBwZWQgaW4gSFRNTCBlbGVtZW50XG4gICAgICovXG4gICAgd3JhcCh0YWcsIGNvbnRlbnQsIGF0dHJzID0ge30pIHtcbiAgICAgICAgY29uc3QgaHRtbEF0dHJzID0gT2JqZWN0LmVudHJpZXMoYXR0cnMpXG4gICAgICAgICAgICAubWFwKChba2V5LCB2YWx1ZV0pID0+IGAgJHtrZXl9PVwiJHt2YWx1ZX1cImApXG4gICAgICAgICAgICAuam9pbignJyk7XG4gICAgICAgIGlmICghY29udGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGA8JHt0YWd9JHtodG1sQXR0cnN9PmA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGA8JHt0YWd9JHtodG1sQXR0cnN9PiR7Y29udGVudH08LyR7dGFnfT5gO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXcml0ZXMgdGV4dCBpbiB0aGUgYnVmZmVyIHRvIHRoZSBzdW1tYXJ5IGJ1ZmZlciBmaWxlIGFuZCBlbXB0aWVzIGJ1ZmZlci4gV2lsbCBhcHBlbmQgYnkgZGVmYXVsdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3VtbWFyeVdyaXRlT3B0aW9uc30gW29wdGlvbnNdIChvcHRpb25hbCkgb3B0aW9ucyBmb3Igd3JpdGUgb3BlcmF0aW9uXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxTdW1tYXJ5Pn0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHdyaXRlKG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGNvbnN0IG92ZXJ3cml0ZSA9ICEhKG9wdGlvbnMgPT09IG51bGwgfHwgb3B0aW9ucyA9PT0gdm9pZCAwID8gdm9pZCAwIDogb3B0aW9ucy5vdmVyd3JpdGUpO1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSB5aWVsZCB0aGlzLmZpbGVQYXRoKCk7XG4gICAgICAgICAgICBjb25zdCB3cml0ZUZ1bmMgPSBvdmVyd3JpdGUgPyB3cml0ZUZpbGUgOiBhcHBlbmRGaWxlO1xuICAgICAgICAgICAgeWllbGQgd3JpdGVGdW5jKGZpbGVQYXRoLCB0aGlzLl9idWZmZXIsIHsgZW5jb2Rpbmc6ICd1dGY4JyB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVtcHR5QnVmZmVyKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgdGhlIHN1bW1hcnkgYnVmZmVyIGFuZCB3aXBlcyB0aGUgc3VtbWFyeSBmaWxlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGNsZWFyKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW1wdHlCdWZmZXIoKS53cml0ZSh7IG92ZXJ3cml0ZTogdHJ1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGN1cnJlbnQgc3VtbWFyeSBidWZmZXIgYXMgYSBzdHJpbmdcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IHN0cmluZyBvZiBzdW1tYXJ5IGJ1ZmZlclxuICAgICAqL1xuICAgIHN0cmluZ2lmeSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2J1ZmZlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSWYgdGhlIHN1bW1hcnkgYnVmZmVyIGlzIGVtcHR5XG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVufSB0cnVlIGlmIHRoZSBidWZmZXIgaXMgZW1wdHlcbiAgICAgKi9cbiAgICBpc0VtcHR5QnVmZmVyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnVmZmVyLmxlbmd0aCA9PT0gMDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVzZXRzIHRoZSBzdW1tYXJ5IGJ1ZmZlciB3aXRob3V0IHdyaXRpbmcgdG8gc3VtbWFyeSBmaWxlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGVtcHR5QnVmZmVyKCkge1xuICAgICAgICB0aGlzLl9idWZmZXIgPSAnJztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgcmF3IHRleHQgdG8gdGhlIHN1bW1hcnkgYnVmZmVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBjb250ZW50IHRvIGFkZFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2FkZEVPTD1mYWxzZV0gKG9wdGlvbmFsKSBhcHBlbmQgYW4gRU9MIHRvIHRoZSByYXcgdGV4dCAoZGVmYXVsdDogZmFsc2UpXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZFJhdyh0ZXh0LCBhZGRFT0wgPSBmYWxzZSkge1xuICAgICAgICB0aGlzLl9idWZmZXIgKz0gdGV4dDtcbiAgICAgICAgcmV0dXJuIGFkZEVPTCA/IHRoaXMuYWRkRU9MKCkgOiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBZGRzIHRoZSBvcGVyYXRpbmcgc3lzdGVtLXNwZWNpZmljIGVuZC1vZi1saW5lIG1hcmtlciB0byB0aGUgYnVmZmVyXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZEVPTCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkUmF3KG9zXzEuRU9MKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBIVE1MIGNvZGVibG9jayB0byB0aGUgc3VtbWFyeSBidWZmZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb2RlIGNvbnRlbnQgdG8gcmVuZGVyIHdpdGhpbiBmZW5jZWQgY29kZSBibG9ja1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYW5nIChvcHRpb25hbCkgbGFuZ3VhZ2UgdG8gc3ludGF4IGhpZ2hsaWdodCBjb2RlXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZENvZGVCbG9jayhjb2RlLCBsYW5nKSB7XG4gICAgICAgIGNvbnN0IGF0dHJzID0gT2JqZWN0LmFzc2lnbih7fSwgKGxhbmcgJiYgeyBsYW5nIH0pKTtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMud3JhcCgncHJlJywgdGhpcy53cmFwKCdjb2RlJywgY29kZSksIGF0dHJzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkUmF3KGVsZW1lbnQpLmFkZEVPTCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBZGRzIGFuIEhUTUwgbGlzdCB0byB0aGUgc3VtbWFyeSBidWZmZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IGl0ZW1zIGxpc3Qgb2YgaXRlbXMgdG8gcmVuZGVyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3JkZXJlZD1mYWxzZV0gKG9wdGlvbmFsKSBpZiB0aGUgcmVuZGVyZWQgbGlzdCBzaG91bGQgYmUgb3JkZXJlZCBvciBub3QgKGRlZmF1bHQ6IGZhbHNlKVxuICAgICAqXG4gICAgICogQHJldHVybnMge1N1bW1hcnl9IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRMaXN0KGl0ZW1zLCBvcmRlcmVkID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgdGFnID0gb3JkZXJlZCA/ICdvbCcgOiAndWwnO1xuICAgICAgICBjb25zdCBsaXN0SXRlbXMgPSBpdGVtcy5tYXAoaXRlbSA9PiB0aGlzLndyYXAoJ2xpJywgaXRlbSkpLmpvaW4oJycpO1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy53cmFwKHRhZywgbGlzdEl0ZW1zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkUmF3KGVsZW1lbnQpLmFkZEVPTCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBZGRzIGFuIEhUTUwgdGFibGUgdG8gdGhlIHN1bW1hcnkgYnVmZmVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N1bW1hcnlUYWJsZUNlbGxbXX0gcm93cyB0YWJsZSByb3dzXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZFRhYmxlKHJvd3MpIHtcbiAgICAgICAgY29uc3QgdGFibGVCb2R5ID0gcm93c1xuICAgICAgICAgICAgLm1hcChyb3cgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2VsbHMgPSByb3dcbiAgICAgICAgICAgICAgICAubWFwKGNlbGwgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY2VsbCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMud3JhcCgndGQnLCBjZWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgeyBoZWFkZXIsIGRhdGEsIGNvbHNwYW4sIHJvd3NwYW4gfSA9IGNlbGw7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFnID0gaGVhZGVyID8gJ3RoJyA6ICd0ZCc7XG4gICAgICAgICAgICAgICAgY29uc3QgYXR0cnMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIChjb2xzcGFuICYmIHsgY29sc3BhbiB9KSksIChyb3dzcGFuICYmIHsgcm93c3BhbiB9KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMud3JhcCh0YWcsIGRhdGEsIGF0dHJzKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmpvaW4oJycpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud3JhcCgndHInLCBjZWxscyk7XG4gICAgICAgIH0pXG4gICAgICAgICAgICAuam9pbignJyk7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLndyYXAoJ3RhYmxlJywgdGFibGVCb2R5KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkUmF3KGVsZW1lbnQpLmFkZEVPTCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgY29sbGFwc2FibGUgSFRNTCBkZXRhaWxzIGVsZW1lbnQgdG8gdGhlIHN1bW1hcnkgYnVmZmVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgdGV4dCBmb3IgdGhlIGNsb3NlZCBzdGF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50IGNvbGxhcHNhYmxlIGNvbnRlbnRcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtTdW1tYXJ5fSBzdW1tYXJ5IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkRGV0YWlscyhsYWJlbCwgY29udGVudCkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy53cmFwKCdkZXRhaWxzJywgdGhpcy53cmFwKCdzdW1tYXJ5JywgbGFiZWwpICsgY29udGVudCk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFJhdyhlbGVtZW50KS5hZGRFT0woKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBIVE1MIGltYWdlIHRhZyB0byB0aGUgc3VtbWFyeSBidWZmZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzcmMgcGF0aCB0byB0aGUgaW1hZ2UgeW91IHRvIGVtYmVkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFsdCB0ZXh0IGRlc2NyaXB0aW9uIG9mIHRoZSBpbWFnZVxuICAgICAqIEBwYXJhbSB7U3VtbWFyeUltYWdlT3B0aW9uc30gb3B0aW9ucyAob3B0aW9uYWwpIGFkZGl0aW9uIGltYWdlIGF0dHJpYnV0ZXNcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtTdW1tYXJ5fSBzdW1tYXJ5IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkSW1hZ2Uoc3JjLCBhbHQsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCBhdHRycyA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgKHdpZHRoICYmIHsgd2lkdGggfSkpLCAoaGVpZ2h0ICYmIHsgaGVpZ2h0IH0pKTtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMud3JhcCgnaW1nJywgbnVsbCwgT2JqZWN0LmFzc2lnbih7IHNyYywgYWx0IH0sIGF0dHJzKSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFJhdyhlbGVtZW50KS5hZGRFT0woKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBIVE1MIHNlY3Rpb24gaGVhZGluZyBlbGVtZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBoZWFkaW5nIHRleHRcbiAgICAgKiBAcGFyYW0ge251bWJlciB8IHN0cmluZ30gW2xldmVsPTFdIChvcHRpb25hbCkgdGhlIGhlYWRpbmcgbGV2ZWwsIGRlZmF1bHQ6IDFcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtTdW1tYXJ5fSBzdW1tYXJ5IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkSGVhZGluZyh0ZXh0LCBsZXZlbCkge1xuICAgICAgICBjb25zdCB0YWcgPSBgaCR7bGV2ZWx9YDtcbiAgICAgICAgY29uc3QgYWxsb3dlZFRhZyA9IFsnaDEnLCAnaDInLCAnaDMnLCAnaDQnLCAnaDUnLCAnaDYnXS5pbmNsdWRlcyh0YWcpXG4gICAgICAgICAgICA/IHRhZ1xuICAgICAgICAgICAgOiAnaDEnO1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy53cmFwKGFsbG93ZWRUYWcsIHRleHQpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRSYXcoZWxlbWVudCkuYWRkRU9MKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gSFRNTCB0aGVtYXRpYyBicmVhayAoPGhyPikgdG8gdGhlIHN1bW1hcnkgYnVmZmVyXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZFNlcGFyYXRvcigpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMud3JhcCgnaHInLCBudWxsKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkUmF3KGVsZW1lbnQpLmFkZEVPTCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBZGRzIGFuIEhUTUwgbGluZSBicmVhayAoPGJyPikgdG8gdGhlIHN1bW1hcnkgYnVmZmVyXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZEJyZWFrKCkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy53cmFwKCdicicsIG51bGwpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRSYXcoZWxlbWVudCkuYWRkRU9MKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gSFRNTCBibG9ja3F1b3RlIHRvIHRoZSBzdW1tYXJ5IGJ1ZmZlclxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgcXVvdGUgdGV4dFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjaXRlIChvcHRpb25hbCkgY2l0YXRpb24gdXJsXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZFF1b3RlKHRleHQsIGNpdGUpIHtcbiAgICAgICAgY29uc3QgYXR0cnMgPSBPYmplY3QuYXNzaWduKHt9LCAoY2l0ZSAmJiB7IGNpdGUgfSkpO1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy53cmFwKCdibG9ja3F1b3RlJywgdGV4dCwgYXR0cnMpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRSYXcoZWxlbWVudCkuYWRkRU9MKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gSFRNTCBhbmNob3IgdGFnIHRvIHRoZSBzdW1tYXJ5IGJ1ZmZlclxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgbGluayB0ZXh0L2NvbnRlbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHJlZiBoeXBlcmxpbmtcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtTdW1tYXJ5fSBzdW1tYXJ5IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkTGluayh0ZXh0LCBocmVmKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLndyYXAoJ2EnLCB0ZXh0LCB7IGhyZWYgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFJhdyhlbGVtZW50KS5hZGRFT0woKTtcbiAgICB9XG59XG5jb25zdCBfc3VtbWFyeSA9IG5ldyBTdW1tYXJ5KCk7XG4vKipcbiAqIEBkZXByZWNhdGVkIHVzZSBgY29yZS5zdW1tYXJ5YFxuICovXG5leHBvcnRzLm1hcmtkb3duU3VtbWFyeSA9IF9zdW1tYXJ5O1xuZXhwb3J0cy5zdW1tYXJ5ID0gX3N1bW1hcnk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1zdW1tYXJ5LmpzLm1hcCIsCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XG4gICAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcbiAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xufSk7XG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMudG9QbGF0Zm9ybVBhdGggPSBleHBvcnRzLnRvV2luMzJQYXRoID0gZXhwb3J0cy50b1Bvc2l4UGF0aCA9IHZvaWQgMDtcbmNvbnN0IHBhdGggPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcInBhdGhcIikpO1xuLyoqXG4gKiB0b1Bvc2l4UGF0aCBjb252ZXJ0cyB0aGUgZ2l2ZW4gcGF0aCB0byB0aGUgcG9zaXggZm9ybS4gT24gV2luZG93cywgXFxcXCB3aWxsIGJlXG4gKiByZXBsYWNlZCB3aXRoIC8uXG4gKlxuICogQHBhcmFtIHB0aC4gUGF0aCB0byB0cmFuc2Zvcm0uXG4gKiBAcmV0dXJuIHN0cmluZyBQb3NpeCBwYXRoLlxuICovXG5mdW5jdGlvbiB0b1Bvc2l4UGF0aChwdGgpIHtcbiAgICByZXR1cm4gcHRoLnJlcGxhY2UoL1tcXFxcXS9nLCAnLycpO1xufVxuZXhwb3J0cy50b1Bvc2l4UGF0aCA9IHRvUG9zaXhQYXRoO1xuLyoqXG4gKiB0b1dpbjMyUGF0aCBjb252ZXJ0cyB0aGUgZ2l2ZW4gcGF0aCB0byB0aGUgd2luMzIgZm9ybS4gT24gTGludXgsIC8gd2lsbCBiZVxuICogcmVwbGFjZWQgd2l0aCBcXFxcLlxuICpcbiAqIEBwYXJhbSBwdGguIFBhdGggdG8gdHJhbnNmb3JtLlxuICogQHJldHVybiBzdHJpbmcgV2luMzIgcGF0aC5cbiAqL1xuZnVuY3Rpb24gdG9XaW4zMlBhdGgocHRoKSB7XG4gICAgcmV0dXJuIHB0aC5yZXBsYWNlKC9bL10vZywgJ1xcXFwnKTtcbn1cbmV4cG9ydHMudG9XaW4zMlBhdGggPSB0b1dpbjMyUGF0aDtcbi8qKlxuICogdG9QbGF0Zm9ybVBhdGggY29udmVydHMgdGhlIGdpdmVuIHBhdGggdG8gYSBwbGF0Zm9ybS1zcGVjaWZpYyBwYXRoLiBJdCBkb2VzXG4gKiB0aGlzIGJ5IHJlcGxhY2luZyBpbnN0YW5jZXMgb2YgLyBhbmQgXFwgd2l0aCB0aGUgcGxhdGZvcm0tc3BlY2lmaWMgcGF0aFxuICogc2VwYXJhdG9yLlxuICpcbiAqIEBwYXJhbSBwdGggVGhlIHBhdGggdG8gcGxhdGZvcm1pemUuXG4gKiBAcmV0dXJuIHN0cmluZyBUaGUgcGxhdGZvcm0tc3BlY2lmaWMgcGF0aC5cbiAqL1xuZnVuY3Rpb24gdG9QbGF0Zm9ybVBhdGgocHRoKSB7XG4gICAgcmV0dXJuIHB0aC5yZXBsYWNlKC9bL1xcXFxdL2csIHBhdGguc2VwKTtcbn1cbmV4cG9ydHMudG9QbGF0Zm9ybVBhdGggPSB0b1BsYXRmb3JtUGF0aDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXBhdGgtdXRpbHMuanMubWFwIiwKICAgICJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2NyZWF0ZUJpbmRpbmcgPSAodGhpcyAmJiB0aGlzLl9fY3JlYXRlQmluZGluZykgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtLCBrKTtcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xuICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCBkZXNjKTtcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBvW2syXSA9IG1ba107XG59KSk7XG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX3NldE1vZHVsZURlZmF1bHQpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XG59KTtcbnZhciBfX2ltcG9ydFN0YXIgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0U3RhcikgfHwgZnVuY3Rpb24gKG1vZCkge1xuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG52YXIgX19pbXBvcnREZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydERlZmF1bHQpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IFwiZGVmYXVsdFwiOiBtb2QgfTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmdldERldGFpbHMgPSBleHBvcnRzLmlzTGludXggPSBleHBvcnRzLmlzTWFjT1MgPSBleHBvcnRzLmlzV2luZG93cyA9IGV4cG9ydHMuYXJjaCA9IGV4cG9ydHMucGxhdGZvcm0gPSB2b2lkIDA7XG5jb25zdCBvc18xID0gX19pbXBvcnREZWZhdWx0KHJlcXVpcmUoXCJvc1wiKSk7XG5jb25zdCBleGVjID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJAYWN0aW9ucy9leGVjXCIpKTtcbmNvbnN0IGdldFdpbmRvd3NJbmZvID0gKCkgPT4gX19hd2FpdGVyKHZvaWQgMCwgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgY29uc3QgeyBzdGRvdXQ6IHZlcnNpb24gfSA9IHlpZWxkIGV4ZWMuZ2V0RXhlY091dHB1dCgncG93ZXJzaGVsbCAtY29tbWFuZCBcIihHZXQtQ2ltSW5zdGFuY2UgLUNsYXNzTmFtZSBXaW4zMl9PcGVyYXRpbmdTeXN0ZW0pLlZlcnNpb25cIicsIHVuZGVmaW5lZCwge1xuICAgICAgICBzaWxlbnQ6IHRydWVcbiAgICB9KTtcbiAgICBjb25zdCB7IHN0ZG91dDogbmFtZSB9ID0geWllbGQgZXhlYy5nZXRFeGVjT3V0cHV0KCdwb3dlcnNoZWxsIC1jb21tYW5kIFwiKEdldC1DaW1JbnN0YW5jZSAtQ2xhc3NOYW1lIFdpbjMyX09wZXJhdGluZ1N5c3RlbSkuQ2FwdGlvblwiJywgdW5kZWZpbmVkLCB7XG4gICAgICAgIHNpbGVudDogdHJ1ZVxuICAgIH0pO1xuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5hbWUudHJpbSgpLFxuICAgICAgICB2ZXJzaW9uOiB2ZXJzaW9uLnRyaW0oKVxuICAgIH07XG59KTtcbmNvbnN0IGdldE1hY09zSW5mbyA9ICgpID0+IF9fYXdhaXRlcih2b2lkIDAsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgIHZhciBfYSwgX2IsIF9jLCBfZDtcbiAgICBjb25zdCB7IHN0ZG91dCB9ID0geWllbGQgZXhlYy5nZXRFeGVjT3V0cHV0KCdzd192ZXJzJywgdW5kZWZpbmVkLCB7XG4gICAgICAgIHNpbGVudDogdHJ1ZVxuICAgIH0pO1xuICAgIGNvbnN0IHZlcnNpb24gPSAoX2IgPSAoX2EgPSBzdGRvdXQubWF0Y2goL1Byb2R1Y3RWZXJzaW9uOlxccyooLispLykpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYVsxXSkgIT09IG51bGwgJiYgX2IgIT09IHZvaWQgMCA/IF9iIDogJyc7XG4gICAgY29uc3QgbmFtZSA9IChfZCA9IChfYyA9IHN0ZG91dC5tYXRjaCgvUHJvZHVjdE5hbWU6XFxzKiguKykvKSkgPT09IG51bGwgfHwgX2MgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9jWzFdKSAhPT0gbnVsbCAmJiBfZCAhPT0gdm9pZCAwID8gX2QgOiAnJztcbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB2ZXJzaW9uXG4gICAgfTtcbn0pO1xuY29uc3QgZ2V0TGludXhJbmZvID0gKCkgPT4gX19hd2FpdGVyKHZvaWQgMCwgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgY29uc3QgeyBzdGRvdXQgfSA9IHlpZWxkIGV4ZWMuZ2V0RXhlY091dHB1dCgnbHNiX3JlbGVhc2UnLCBbJy1pJywgJy1yJywgJy1zJ10sIHtcbiAgICAgICAgc2lsZW50OiB0cnVlXG4gICAgfSk7XG4gICAgY29uc3QgW25hbWUsIHZlcnNpb25dID0gc3Rkb3V0LnRyaW0oKS5zcGxpdCgnXFxuJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdmVyc2lvblxuICAgIH07XG59KTtcbmV4cG9ydHMucGxhdGZvcm0gPSBvc18xLmRlZmF1bHQucGxhdGZvcm0oKTtcbmV4cG9ydHMuYXJjaCA9IG9zXzEuZGVmYXVsdC5hcmNoKCk7XG5leHBvcnRzLmlzV2luZG93cyA9IGV4cG9ydHMucGxhdGZvcm0gPT09ICd3aW4zMic7XG5leHBvcnRzLmlzTWFjT1MgPSBleHBvcnRzLnBsYXRmb3JtID09PSAnZGFyd2luJztcbmV4cG9ydHMuaXNMaW51eCA9IGV4cG9ydHMucGxhdGZvcm0gPT09ICdsaW51eCc7XG5mdW5jdGlvbiBnZXREZXRhaWxzKCkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sICh5aWVsZCAoZXhwb3J0cy5pc1dpbmRvd3NcbiAgICAgICAgICAgID8gZ2V0V2luZG93c0luZm8oKVxuICAgICAgICAgICAgOiBleHBvcnRzLmlzTWFjT1NcbiAgICAgICAgICAgICAgICA/IGdldE1hY09zSW5mbygpXG4gICAgICAgICAgICAgICAgOiBnZXRMaW51eEluZm8oKSkpKSwgeyBwbGF0Zm9ybTogZXhwb3J0cy5wbGF0Zm9ybSxcbiAgICAgICAgICAgIGFyY2g6IGV4cG9ydHMuYXJjaCxcbiAgICAgICAgICAgIGlzV2luZG93czogZXhwb3J0cy5pc1dpbmRvd3MsXG4gICAgICAgICAgICBpc01hY09TOiBleHBvcnRzLmlzTWFjT1MsXG4gICAgICAgICAgICBpc0xpbnV4OiBleHBvcnRzLmlzTGludXggfSk7XG4gICAgfSk7XG59XG5leHBvcnRzLmdldERldGFpbHMgPSBnZXREZXRhaWxzO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cGxhdGZvcm0uanMubWFwIiwKICAgICJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2NyZWF0ZUJpbmRpbmcgPSAodGhpcyAmJiB0aGlzLl9fY3JlYXRlQmluZGluZykgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtLCBrKTtcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xuICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCBkZXNjKTtcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBvW2syXSA9IG1ba107XG59KSk7XG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX3NldE1vZHVsZURlZmF1bHQpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XG59KTtcbnZhciBfX2ltcG9ydFN0YXIgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0U3RhcikgfHwgZnVuY3Rpb24gKG1vZCkge1xuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLnBsYXRmb3JtID0gZXhwb3J0cy50b1BsYXRmb3JtUGF0aCA9IGV4cG9ydHMudG9XaW4zMlBhdGggPSBleHBvcnRzLnRvUG9zaXhQYXRoID0gZXhwb3J0cy5tYXJrZG93blN1bW1hcnkgPSBleHBvcnRzLnN1bW1hcnkgPSBleHBvcnRzLmdldElEVG9rZW4gPSBleHBvcnRzLmdldFN0YXRlID0gZXhwb3J0cy5zYXZlU3RhdGUgPSBleHBvcnRzLmdyb3VwID0gZXhwb3J0cy5lbmRHcm91cCA9IGV4cG9ydHMuc3RhcnRHcm91cCA9IGV4cG9ydHMuaW5mbyA9IGV4cG9ydHMubm90aWNlID0gZXhwb3J0cy53YXJuaW5nID0gZXhwb3J0cy5lcnJvciA9IGV4cG9ydHMuZGVidWcgPSBleHBvcnRzLmlzRGVidWcgPSBleHBvcnRzLnNldEZhaWxlZCA9IGV4cG9ydHMuc2V0Q29tbWFuZEVjaG8gPSBleHBvcnRzLnNldE91dHB1dCA9IGV4cG9ydHMuZ2V0Qm9vbGVhbklucHV0ID0gZXhwb3J0cy5nZXRNdWx0aWxpbmVJbnB1dCA9IGV4cG9ydHMuZ2V0SW5wdXQgPSBleHBvcnRzLmFkZFBhdGggPSBleHBvcnRzLnNldFNlY3JldCA9IGV4cG9ydHMuZXhwb3J0VmFyaWFibGUgPSBleHBvcnRzLkV4aXRDb2RlID0gdm9pZCAwO1xuY29uc3QgY29tbWFuZF8xID0gcmVxdWlyZShcIi4vY29tbWFuZFwiKTtcbmNvbnN0IGZpbGVfY29tbWFuZF8xID0gcmVxdWlyZShcIi4vZmlsZS1jb21tYW5kXCIpO1xuY29uc3QgdXRpbHNfMSA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xuY29uc3Qgb3MgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcIm9zXCIpKTtcbmNvbnN0IHBhdGggPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcInBhdGhcIikpO1xuY29uc3Qgb2lkY191dGlsc18xID0gcmVxdWlyZShcIi4vb2lkYy11dGlsc1wiKTtcbi8qKlxuICogVGhlIGNvZGUgdG8gZXhpdCBhbiBhY3Rpb25cbiAqL1xudmFyIEV4aXRDb2RlO1xuKGZ1bmN0aW9uIChFeGl0Q29kZSkge1xuICAgIC8qKlxuICAgICAqIEEgY29kZSBpbmRpY2F0aW5nIHRoYXQgdGhlIGFjdGlvbiB3YXMgc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIEV4aXRDb2RlW0V4aXRDb2RlW1wiU3VjY2Vzc1wiXSA9IDBdID0gXCJTdWNjZXNzXCI7XG4gICAgLyoqXG4gICAgICogQSBjb2RlIGluZGljYXRpbmcgdGhhdCB0aGUgYWN0aW9uIHdhcyBhIGZhaWx1cmVcbiAgICAgKi9cbiAgICBFeGl0Q29kZVtFeGl0Q29kZVtcIkZhaWx1cmVcIl0gPSAxXSA9IFwiRmFpbHVyZVwiO1xufSkoRXhpdENvZGUgfHwgKGV4cG9ydHMuRXhpdENvZGUgPSBFeGl0Q29kZSA9IHt9KSk7XG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBWYXJpYWJsZXNcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogU2V0cyBlbnYgdmFyaWFibGUgZm9yIHRoaXMgYWN0aW9uIGFuZCBmdXR1cmUgYWN0aW9ucyBpbiB0aGUgam9iXG4gKiBAcGFyYW0gbmFtZSB0aGUgbmFtZSBvZiB0aGUgdmFyaWFibGUgdG8gc2V0XG4gKiBAcGFyYW0gdmFsIHRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUuIE5vbi1zdHJpbmcgdmFsdWVzIHdpbGwgYmUgY29udmVydGVkIHRvIGEgc3RyaW5nIHZpYSBKU09OLnN0cmluZ2lmeVxuICovXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuZnVuY3Rpb24gZXhwb3J0VmFyaWFibGUobmFtZSwgdmFsKSB7XG4gICAgY29uc3QgY29udmVydGVkVmFsID0gKDAsIHV0aWxzXzEudG9Db21tYW5kVmFsdWUpKHZhbCk7XG4gICAgcHJvY2Vzcy5lbnZbbmFtZV0gPSBjb252ZXJ0ZWRWYWw7XG4gICAgY29uc3QgZmlsZVBhdGggPSBwcm9jZXNzLmVudlsnR0lUSFVCX0VOViddIHx8ICcnO1xuICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgICByZXR1cm4gKDAsIGZpbGVfY29tbWFuZF8xLmlzc3VlRmlsZUNvbW1hbmQpKCdFTlYnLCAoMCwgZmlsZV9jb21tYW5kXzEucHJlcGFyZUtleVZhbHVlTWVzc2FnZSkobmFtZSwgdmFsKSk7XG4gICAgfVxuICAgICgwLCBjb21tYW5kXzEuaXNzdWVDb21tYW5kKSgnc2V0LWVudicsIHsgbmFtZSB9LCBjb252ZXJ0ZWRWYWwpO1xufVxuZXhwb3J0cy5leHBvcnRWYXJpYWJsZSA9IGV4cG9ydFZhcmlhYmxlO1xuLyoqXG4gKiBSZWdpc3RlcnMgYSBzZWNyZXQgd2hpY2ggd2lsbCBnZXQgbWFza2VkIGZyb20gbG9nc1xuICogQHBhcmFtIHNlY3JldCB2YWx1ZSBvZiB0aGUgc2VjcmV0XG4gKi9cbmZ1bmN0aW9uIHNldFNlY3JldChzZWNyZXQpIHtcbiAgICAoMCwgY29tbWFuZF8xLmlzc3VlQ29tbWFuZCkoJ2FkZC1tYXNrJywge30sIHNlY3JldCk7XG59XG5leHBvcnRzLnNldFNlY3JldCA9IHNldFNlY3JldDtcbi8qKlxuICogUHJlcGVuZHMgaW5wdXRQYXRoIHRvIHRoZSBQQVRIIChmb3IgdGhpcyBhY3Rpb24gYW5kIGZ1dHVyZSBhY3Rpb25zKVxuICogQHBhcmFtIGlucHV0UGF0aFxuICovXG5mdW5jdGlvbiBhZGRQYXRoKGlucHV0UGF0aCkge1xuICAgIGNvbnN0IGZpbGVQYXRoID0gcHJvY2Vzcy5lbnZbJ0dJVEhVQl9QQVRIJ10gfHwgJyc7XG4gICAgaWYgKGZpbGVQYXRoKSB7XG4gICAgICAgICgwLCBmaWxlX2NvbW1hbmRfMS5pc3N1ZUZpbGVDb21tYW5kKSgnUEFUSCcsIGlucHV0UGF0aCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAoMCwgY29tbWFuZF8xLmlzc3VlQ29tbWFuZCkoJ2FkZC1wYXRoJywge30sIGlucHV0UGF0aCk7XG4gICAgfVxuICAgIHByb2Nlc3MuZW52WydQQVRIJ10gPSBgJHtpbnB1dFBhdGh9JHtwYXRoLmRlbGltaXRlcn0ke3Byb2Nlc3MuZW52WydQQVRIJ119YDtcbn1cbmV4cG9ydHMuYWRkUGF0aCA9IGFkZFBhdGg7XG4vKipcbiAqIEdldHMgdGhlIHZhbHVlIG9mIGFuIGlucHV0LlxuICogVW5sZXNzIHRyaW1XaGl0ZXNwYWNlIGlzIHNldCB0byBmYWxzZSBpbiBJbnB1dE9wdGlvbnMsIHRoZSB2YWx1ZSBpcyBhbHNvIHRyaW1tZWQuXG4gKiBSZXR1cm5zIGFuIGVtcHR5IHN0cmluZyBpZiB0aGUgdmFsdWUgaXMgbm90IGRlZmluZWQuXG4gKlxuICogQHBhcmFtICAgICBuYW1lICAgICBuYW1lIG9mIHRoZSBpbnB1dCB0byBnZXRcbiAqIEBwYXJhbSAgICAgb3B0aW9ucyAgb3B0aW9uYWwuIFNlZSBJbnB1dE9wdGlvbnMuXG4gKiBAcmV0dXJucyAgIHN0cmluZ1xuICovXG5mdW5jdGlvbiBnZXRJbnB1dChuYW1lLCBvcHRpb25zKSB7XG4gICAgY29uc3QgdmFsID0gcHJvY2Vzcy5lbnZbYElOUFVUXyR7bmFtZS5yZXBsYWNlKC8gL2csICdfJykudG9VcHBlckNhc2UoKX1gXSB8fCAnJztcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnJlcXVpcmVkICYmICF2YWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnB1dCByZXF1aXJlZCBhbmQgbm90IHN1cHBsaWVkOiAke25hbWV9YCk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMudHJpbVdoaXRlc3BhY2UgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuICAgIHJldHVybiB2YWwudHJpbSgpO1xufVxuZXhwb3J0cy5nZXRJbnB1dCA9IGdldElucHV0O1xuLyoqXG4gKiBHZXRzIHRoZSB2YWx1ZXMgb2YgYW4gbXVsdGlsaW5lIGlucHV0LiAgRWFjaCB2YWx1ZSBpcyBhbHNvIHRyaW1tZWQuXG4gKlxuICogQHBhcmFtICAgICBuYW1lICAgICBuYW1lIG9mIHRoZSBpbnB1dCB0byBnZXRcbiAqIEBwYXJhbSAgICAgb3B0aW9ucyAgb3B0aW9uYWwuIFNlZSBJbnB1dE9wdGlvbnMuXG4gKiBAcmV0dXJucyAgIHN0cmluZ1tdXG4gKlxuICovXG5mdW5jdGlvbiBnZXRNdWx0aWxpbmVJbnB1dChuYW1lLCBvcHRpb25zKSB7XG4gICAgY29uc3QgaW5wdXRzID0gZ2V0SW5wdXQobmFtZSwgb3B0aW9ucylcbiAgICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgICAuZmlsdGVyKHggPT4geCAhPT0gJycpO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMudHJpbVdoaXRlc3BhY2UgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBpbnB1dHM7XG4gICAgfVxuICAgIHJldHVybiBpbnB1dHMubWFwKGlucHV0ID0+IGlucHV0LnRyaW0oKSk7XG59XG5leHBvcnRzLmdldE11bHRpbGluZUlucHV0ID0gZ2V0TXVsdGlsaW5lSW5wdXQ7XG4vKipcbiAqIEdldHMgdGhlIGlucHV0IHZhbHVlIG9mIHRoZSBib29sZWFuIHR5cGUgaW4gdGhlIFlBTUwgMS4yIFwiY29yZSBzY2hlbWFcIiBzcGVjaWZpY2F0aW9uLlxuICogU3VwcG9ydCBib29sZWFuIGlucHV0IGxpc3Q6IGB0cnVlIHwgVHJ1ZSB8IFRSVUUgfCBmYWxzZSB8IEZhbHNlIHwgRkFMU0VgIC5cbiAqIFRoZSByZXR1cm4gdmFsdWUgaXMgYWxzbyBpbiBib29sZWFuIHR5cGUuXG4gKiByZWY6IGh0dHBzOi8veWFtbC5vcmcvc3BlYy8xLjIvc3BlYy5odG1sI2lkMjgwNDkyM1xuICpcbiAqIEBwYXJhbSAgICAgbmFtZSAgICAgbmFtZSBvZiB0aGUgaW5wdXQgdG8gZ2V0XG4gKiBAcGFyYW0gICAgIG9wdGlvbnMgIG9wdGlvbmFsLiBTZWUgSW5wdXRPcHRpb25zLlxuICogQHJldHVybnMgICBib29sZWFuXG4gKi9cbmZ1bmN0aW9uIGdldEJvb2xlYW5JbnB1dChuYW1lLCBvcHRpb25zKSB7XG4gICAgY29uc3QgdHJ1ZVZhbHVlID0gWyd0cnVlJywgJ1RydWUnLCAnVFJVRSddO1xuICAgIGNvbnN0IGZhbHNlVmFsdWUgPSBbJ2ZhbHNlJywgJ0ZhbHNlJywgJ0ZBTFNFJ107XG4gICAgY29uc3QgdmFsID0gZ2V0SW5wdXQobmFtZSwgb3B0aW9ucyk7XG4gICAgaWYgKHRydWVWYWx1ZS5pbmNsdWRlcyh2YWwpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoZmFsc2VWYWx1ZS5pbmNsdWRlcyh2YWwpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW5wdXQgZG9lcyBub3QgbWVldCBZQU1MIDEuMiBcIkNvcmUgU2NoZW1hXCIgc3BlY2lmaWNhdGlvbjogJHtuYW1lfVxcbmAgK1xuICAgICAgICBgU3VwcG9ydCBib29sZWFuIGlucHV0IGxpc3Q6IFxcYHRydWUgfCBUcnVlIHwgVFJVRSB8IGZhbHNlIHwgRmFsc2UgfCBGQUxTRVxcYGApO1xufVxuZXhwb3J0cy5nZXRCb29sZWFuSW5wdXQgPSBnZXRCb29sZWFuSW5wdXQ7XG4vKipcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGFuIG91dHB1dC5cbiAqXG4gKiBAcGFyYW0gICAgIG5hbWUgICAgIG5hbWUgb2YgdGhlIG91dHB1dCB0byBzZXRcbiAqIEBwYXJhbSAgICAgdmFsdWUgICAgdmFsdWUgdG8gc3RvcmUuIE5vbi1zdHJpbmcgdmFsdWVzIHdpbGwgYmUgY29udmVydGVkIHRvIGEgc3RyaW5nIHZpYSBKU09OLnN0cmluZ2lmeVxuICovXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuZnVuY3Rpb24gc2V0T3V0cHV0KG5hbWUsIHZhbHVlKSB7XG4gICAgY29uc3QgZmlsZVBhdGggPSBwcm9jZXNzLmVudlsnR0lUSFVCX09VVFBVVCddIHx8ICcnO1xuICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgICByZXR1cm4gKDAsIGZpbGVfY29tbWFuZF8xLmlzc3VlRmlsZUNvbW1hbmQpKCdPVVRQVVQnLCAoMCwgZmlsZV9jb21tYW5kXzEucHJlcGFyZUtleVZhbHVlTWVzc2FnZSkobmFtZSwgdmFsdWUpKTtcbiAgICB9XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUob3MuRU9MKTtcbiAgICAoMCwgY29tbWFuZF8xLmlzc3VlQ29tbWFuZCkoJ3NldC1vdXRwdXQnLCB7IG5hbWUgfSwgKDAsIHV0aWxzXzEudG9Db21tYW5kVmFsdWUpKHZhbHVlKSk7XG59XG5leHBvcnRzLnNldE91dHB1dCA9IHNldE91dHB1dDtcbi8qKlxuICogRW5hYmxlcyBvciBkaXNhYmxlcyB0aGUgZWNob2luZyBvZiBjb21tYW5kcyBpbnRvIHN0ZG91dCBmb3IgdGhlIHJlc3Qgb2YgdGhlIHN0ZXAuXG4gKiBFY2hvaW5nIGlzIGRpc2FibGVkIGJ5IGRlZmF1bHQgaWYgQUNUSU9OU19TVEVQX0RFQlVHIGlzIG5vdCBzZXQuXG4gKlxuICovXG5mdW5jdGlvbiBzZXRDb21tYW5kRWNobyhlbmFibGVkKSB7XG4gICAgKDAsIGNvbW1hbmRfMS5pc3N1ZSkoJ2VjaG8nLCBlbmFibGVkID8gJ29uJyA6ICdvZmYnKTtcbn1cbmV4cG9ydHMuc2V0Q29tbWFuZEVjaG8gPSBzZXRDb21tYW5kRWNobztcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFJlc3VsdHNcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qKlxuICogU2V0cyB0aGUgYWN0aW9uIHN0YXR1cyB0byBmYWlsZWQuXG4gKiBXaGVuIHRoZSBhY3Rpb24gZXhpdHMgaXQgd2lsbCBiZSB3aXRoIGFuIGV4aXQgY29kZSBvZiAxXG4gKiBAcGFyYW0gbWVzc2FnZSBhZGQgZXJyb3IgaXNzdWUgbWVzc2FnZVxuICovXG5mdW5jdGlvbiBzZXRGYWlsZWQobWVzc2FnZSkge1xuICAgIHByb2Nlc3MuZXhpdENvZGUgPSBFeGl0Q29kZS5GYWlsdXJlO1xuICAgIGVycm9yKG1lc3NhZ2UpO1xufVxuZXhwb3J0cy5zZXRGYWlsZWQgPSBzZXRGYWlsZWQ7XG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBMb2dnaW5nIENvbW1hbmRzXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIEdldHMgd2hldGhlciBBY3Rpb25zIFN0ZXAgRGVidWcgaXMgb24gb3Igbm90XG4gKi9cbmZ1bmN0aW9uIGlzRGVidWcoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52WydSVU5ORVJfREVCVUcnXSA9PT0gJzEnO1xufVxuZXhwb3J0cy5pc0RlYnVnID0gaXNEZWJ1Zztcbi8qKlxuICogV3JpdGVzIGRlYnVnIG1lc3NhZ2UgdG8gdXNlciBsb2dcbiAqIEBwYXJhbSBtZXNzYWdlIGRlYnVnIG1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gZGVidWcobWVzc2FnZSkge1xuICAgICgwLCBjb21tYW5kXzEuaXNzdWVDb21tYW5kKSgnZGVidWcnLCB7fSwgbWVzc2FnZSk7XG59XG5leHBvcnRzLmRlYnVnID0gZGVidWc7XG4vKipcbiAqIEFkZHMgYW4gZXJyb3IgaXNzdWVcbiAqIEBwYXJhbSBtZXNzYWdlIGVycm9yIGlzc3VlIG1lc3NhZ2UuIEVycm9ycyB3aWxsIGJlIGNvbnZlcnRlZCB0byBzdHJpbmcgdmlhIHRvU3RyaW5nKClcbiAqIEBwYXJhbSBwcm9wZXJ0aWVzIG9wdGlvbmFsIHByb3BlcnRpZXMgdG8gYWRkIHRvIHRoZSBhbm5vdGF0aW9uLlxuICovXG5mdW5jdGlvbiBlcnJvcihtZXNzYWdlLCBwcm9wZXJ0aWVzID0ge30pIHtcbiAgICAoMCwgY29tbWFuZF8xLmlzc3VlQ29tbWFuZCkoJ2Vycm9yJywgKDAsIHV0aWxzXzEudG9Db21tYW5kUHJvcGVydGllcykocHJvcGVydGllcyksIG1lc3NhZ2UgaW5zdGFuY2VvZiBFcnJvciA/IG1lc3NhZ2UudG9TdHJpbmcoKSA6IG1lc3NhZ2UpO1xufVxuZXhwb3J0cy5lcnJvciA9IGVycm9yO1xuLyoqXG4gKiBBZGRzIGEgd2FybmluZyBpc3N1ZVxuICogQHBhcmFtIG1lc3NhZ2Ugd2FybmluZyBpc3N1ZSBtZXNzYWdlLiBFcnJvcnMgd2lsbCBiZSBjb252ZXJ0ZWQgdG8gc3RyaW5nIHZpYSB0b1N0cmluZygpXG4gKiBAcGFyYW0gcHJvcGVydGllcyBvcHRpb25hbCBwcm9wZXJ0aWVzIHRvIGFkZCB0byB0aGUgYW5ub3RhdGlvbi5cbiAqL1xuZnVuY3Rpb24gd2FybmluZyhtZXNzYWdlLCBwcm9wZXJ0aWVzID0ge30pIHtcbiAgICAoMCwgY29tbWFuZF8xLmlzc3VlQ29tbWFuZCkoJ3dhcm5pbmcnLCAoMCwgdXRpbHNfMS50b0NvbW1hbmRQcm9wZXJ0aWVzKShwcm9wZXJ0aWVzKSwgbWVzc2FnZSBpbnN0YW5jZW9mIEVycm9yID8gbWVzc2FnZS50b1N0cmluZygpIDogbWVzc2FnZSk7XG59XG5leHBvcnRzLndhcm5pbmcgPSB3YXJuaW5nO1xuLyoqXG4gKiBBZGRzIGEgbm90aWNlIGlzc3VlXG4gKiBAcGFyYW0gbWVzc2FnZSBub3RpY2UgaXNzdWUgbWVzc2FnZS4gRXJyb3JzIHdpbGwgYmUgY29udmVydGVkIHRvIHN0cmluZyB2aWEgdG9TdHJpbmcoKVxuICogQHBhcmFtIHByb3BlcnRpZXMgb3B0aW9uYWwgcHJvcGVydGllcyB0byBhZGQgdG8gdGhlIGFubm90YXRpb24uXG4gKi9cbmZ1bmN0aW9uIG5vdGljZShtZXNzYWdlLCBwcm9wZXJ0aWVzID0ge30pIHtcbiAgICAoMCwgY29tbWFuZF8xLmlzc3VlQ29tbWFuZCkoJ25vdGljZScsICgwLCB1dGlsc18xLnRvQ29tbWFuZFByb3BlcnRpZXMpKHByb3BlcnRpZXMpLCBtZXNzYWdlIGluc3RhbmNlb2YgRXJyb3IgPyBtZXNzYWdlLnRvU3RyaW5nKCkgOiBtZXNzYWdlKTtcbn1cbmV4cG9ydHMubm90aWNlID0gbm90aWNlO1xuLyoqXG4gKiBXcml0ZXMgaW5mbyB0byBsb2cgd2l0aCBjb25zb2xlLmxvZy5cbiAqIEBwYXJhbSBtZXNzYWdlIGluZm8gbWVzc2FnZVxuICovXG5mdW5jdGlvbiBpbmZvKG1lc3NhZ2UpIHtcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShtZXNzYWdlICsgb3MuRU9MKTtcbn1cbmV4cG9ydHMuaW5mbyA9IGluZm87XG4vKipcbiAqIEJlZ2luIGFuIG91dHB1dCBncm91cC5cbiAqXG4gKiBPdXRwdXQgdW50aWwgdGhlIG5leHQgYGdyb3VwRW5kYCB3aWxsIGJlIGZvbGRhYmxlIGluIHRoaXMgZ3JvdXBcbiAqXG4gKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiB0aGUgb3V0cHV0IGdyb3VwXG4gKi9cbmZ1bmN0aW9uIHN0YXJ0R3JvdXAobmFtZSkge1xuICAgICgwLCBjb21tYW5kXzEuaXNzdWUpKCdncm91cCcsIG5hbWUpO1xufVxuZXhwb3J0cy5zdGFydEdyb3VwID0gc3RhcnRHcm91cDtcbi8qKlxuICogRW5kIGFuIG91dHB1dCBncm91cC5cbiAqL1xuZnVuY3Rpb24gZW5kR3JvdXAoKSB7XG4gICAgKDAsIGNvbW1hbmRfMS5pc3N1ZSkoJ2VuZGdyb3VwJyk7XG59XG5leHBvcnRzLmVuZEdyb3VwID0gZW5kR3JvdXA7XG4vKipcbiAqIFdyYXAgYW4gYXN5bmNocm9ub3VzIGZ1bmN0aW9uIGNhbGwgaW4gYSBncm91cC5cbiAqXG4gKiBSZXR1cm5zIHRoZSBzYW1lIHR5cGUgYXMgdGhlIGZ1bmN0aW9uIGl0c2VsZi5cbiAqXG4gKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiB0aGUgZ3JvdXBcbiAqIEBwYXJhbSBmbiBUaGUgZnVuY3Rpb24gdG8gd3JhcCBpbiB0aGUgZ3JvdXBcbiAqL1xuZnVuY3Rpb24gZ3JvdXAobmFtZSwgZm4pIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICBzdGFydEdyb3VwKG5hbWUpO1xuICAgICAgICBsZXQgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0geWllbGQgZm4oKTtcbiAgICAgICAgfVxuICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgIGVuZEdyb3VwKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZ3JvdXAgPSBncm91cDtcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFdyYXBwZXIgYWN0aW9uIHN0YXRlXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFNhdmVzIHN0YXRlIGZvciBjdXJyZW50IGFjdGlvbiwgdGhlIHN0YXRlIGNhbiBvbmx5IGJlIHJldHJpZXZlZCBieSB0aGlzIGFjdGlvbidzIHBvc3Qgam9iIGV4ZWN1dGlvbi5cbiAqXG4gKiBAcGFyYW0gICAgIG5hbWUgICAgIG5hbWUgb2YgdGhlIHN0YXRlIHRvIHN0b3JlXG4gKiBAcGFyYW0gICAgIHZhbHVlICAgIHZhbHVlIHRvIHN0b3JlLiBOb24tc3RyaW5nIHZhbHVlcyB3aWxsIGJlIGNvbnZlcnRlZCB0byBhIHN0cmluZyB2aWEgSlNPTi5zdHJpbmdpZnlcbiAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbmZ1bmN0aW9uIHNhdmVTdGF0ZShuYW1lLCB2YWx1ZSkge1xuICAgIGNvbnN0IGZpbGVQYXRoID0gcHJvY2Vzcy5lbnZbJ0dJVEhVQl9TVEFURSddIHx8ICcnO1xuICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgICByZXR1cm4gKDAsIGZpbGVfY29tbWFuZF8xLmlzc3VlRmlsZUNvbW1hbmQpKCdTVEFURScsICgwLCBmaWxlX2NvbW1hbmRfMS5wcmVwYXJlS2V5VmFsdWVNZXNzYWdlKShuYW1lLCB2YWx1ZSkpO1xuICAgIH1cbiAgICAoMCwgY29tbWFuZF8xLmlzc3VlQ29tbWFuZCkoJ3NhdmUtc3RhdGUnLCB7IG5hbWUgfSwgKDAsIHV0aWxzXzEudG9Db21tYW5kVmFsdWUpKHZhbHVlKSk7XG59XG5leHBvcnRzLnNhdmVTdGF0ZSA9IHNhdmVTdGF0ZTtcbi8qKlxuICogR2V0cyB0aGUgdmFsdWUgb2YgYW4gc3RhdGUgc2V0IGJ5IHRoaXMgYWN0aW9uJ3MgbWFpbiBleGVjdXRpb24uXG4gKlxuICogQHBhcmFtICAgICBuYW1lICAgICBuYW1lIG9mIHRoZSBzdGF0ZSB0byBnZXRcbiAqIEByZXR1cm5zICAgc3RyaW5nXG4gKi9cbmZ1bmN0aW9uIGdldFN0YXRlKG5hbWUpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbYFNUQVRFXyR7bmFtZX1gXSB8fCAnJztcbn1cbmV4cG9ydHMuZ2V0U3RhdGUgPSBnZXRTdGF0ZTtcbmZ1bmN0aW9uIGdldElEVG9rZW4oYXVkKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgcmV0dXJuIHlpZWxkIG9pZGNfdXRpbHNfMS5PaWRjQ2xpZW50LmdldElEVG9rZW4oYXVkKTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZ2V0SURUb2tlbiA9IGdldElEVG9rZW47XG4vKipcbiAqIFN1bW1hcnkgZXhwb3J0c1xuICovXG52YXIgc3VtbWFyeV8xID0gcmVxdWlyZShcIi4vc3VtbWFyeVwiKTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcInN1bW1hcnlcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHN1bW1hcnlfMS5zdW1tYXJ5OyB9IH0pO1xuLyoqXG4gKiBAZGVwcmVjYXRlZCB1c2UgY29yZS5zdW1tYXJ5XG4gKi9cbnZhciBzdW1tYXJ5XzIgPSByZXF1aXJlKFwiLi9zdW1tYXJ5XCIpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwibWFya2Rvd25TdW1tYXJ5XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBzdW1tYXJ5XzIubWFya2Rvd25TdW1tYXJ5OyB9IH0pO1xuLyoqXG4gKiBQYXRoIGV4cG9ydHNcbiAqL1xudmFyIHBhdGhfdXRpbHNfMSA9IHJlcXVpcmUoXCIuL3BhdGgtdXRpbHNcIik7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJ0b1Bvc2l4UGF0aFwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gcGF0aF91dGlsc18xLnRvUG9zaXhQYXRoOyB9IH0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwidG9XaW4zMlBhdGhcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHBhdGhfdXRpbHNfMS50b1dpbjMyUGF0aDsgfSB9KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcInRvUGxhdGZvcm1QYXRoXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBwYXRoX3V0aWxzXzEudG9QbGF0Zm9ybVBhdGg7IH0gfSk7XG4vKipcbiAqIFBsYXRmb3JtIHV0aWxpdGllcyBleHBvcnRzXG4gKi9cbmV4cG9ydHMucGxhdGZvcm0gPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcIi4vcGxhdGZvcm1cIikpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29yZS5qcy5tYXAiCiAgXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0VBQ0EsSUFB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QUUsWUFBWSxJQUFNLEtBQUssUUFBUyxHQUFHO0FBQUEsSUFBRSxPQUFPLFVBQVU7QUFBQSxJQUFtQixDQUFDO0FBQUEsRUFJOUgsSUFBSTtBQUFBLEVBQ0osT0FBTyxlQUFlLFNBQVMsZUFBZSxFQUFFLFlBQVksSUFBTSxLQUFLLFFBQVMsR0FBRztBQUFBLElBQUUsT0FBTyxhQUFhO0FBQUEsSUFBZSxDQUFDO0FBQUEsRUFDekgsT0FBTyxlQUFlLFNBQVMsZUFBZSxFQUFFLFlBQVksSUFBTSxLQUFLLFFBQVMsR0FBRztBQUFBLElBQUUsT0FBTyxhQUFhO0FBQUEsSUFBZSxDQUFDO0FBQUEsRUFDekgsT0FBTyxlQUFlLFNBQVMsa0JBQWtCLEVBQUUsWUFBWSxJQUFNLEtBQUssUUFBUyxHQUFHO0FBQUEsSUFBRSxPQUFPLGFBQWE7QUFBQSxJQUFrQixDQUFDO0FBQUEsRUFJL0gsUUFBUSxXQUFXLCtCQUFrQztBQUFBOyIsCiAgImRlYnVnSWQiOiAiODRGQUZDNUUxMEUwMEZFMTY0NzU2RTIxNjQ3NTZFMjEiLAogICJuYW1lcyI6IFtdCn0=
