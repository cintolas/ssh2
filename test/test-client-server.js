var Client = require('../lib/client');
var Server = require('../lib/server');
var OPEN_MODE = require('ssh2-streams').SFTPStream.OPEN_MODE;
var STATUS_CODE = require('ssh2-streams').SFTPStream.STATUS_CODE;
var utils = require('ssh2-streams').utils;

var semver = require('semver');

var net = require('net');
var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var join = path.join;
var inspect = require('util').inspect;
var assert = require('assert');

var t = -1;
var group = path.basename(__filename, '.js') + '/';
var fixturesdir = join(__dirname, 'fixtures');

var USER = 'nodejs';
var PASSWORD = 'FLUXCAPACITORISTHEPOWER';
var MD5_HOST_FINGERPRINT = '64254520742d3d0792e918f3ce945a64';
var HOST_KEY_RSA = fs.readFileSync(join(fixturesdir, 'ssh_host_rsa_key'));
var HOST_KEY_DSA = fs.readFileSync(join(fixturesdir, 'ssh_host_dsa_key'));
var HOST_KEY_ECDSA = fs.readFileSync(join(fixturesdir, 'ssh_host_ecdsa_key'));
var CLIENT_KEY_PPK_RSA = fs.readFileSync(join(fixturesdir, 'id_rsa.ppk'));
var CLIENT_KEY_PPK_RSA_PUB = utils.parseKey(CLIENT_KEY_PPK_RSA);
var CLIENT_KEY_RSA = fs.readFileSync(join(fixturesdir, 'id_rsa'));
var CLIENT_KEY_RSA_PUB = utils.genPublicKey(utils.parseKey(CLIENT_KEY_RSA));
var CLIENT_KEY_DSA = fs.readFileSync(join(fixturesdir, 'id_dsa'));
var CLIENT_KEY_DSA_PUB = utils.genPublicKey(utils.parseKey(CLIENT_KEY_DSA));
if (semver.gte(process.version, '5.2.0')) {
  var CLIENT_KEY_ECDSA = fs.readFileSync(join(fixturesdir, 'id_ecdsa'));
  var CLIENT_KEY_ECDSA_PUB = utils.genPublicKey(
    utils.parseKey(CLIENT_KEY_ECDSA)
  );
}
var DEBUG = false;

var tests = [
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          privateKey: CLIENT_KEY_RSA
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          assert(ctx.method === 'publickey',
                 makeMsg(what, 'Unexpected auth method: ' + ctx.method));
          assert(ctx.username === USER,
                 makeMsg(what, 'Unexpected username: ' + ctx.username));
          assert(ctx.key.algo === 'ssh-rsa',
                 makeMsg(what, 'Unexpected key algo: ' + ctx.key.algo));
          assert.deepEqual(CLIENT_KEY_RSA_PUB.public,
                           ctx.key.data,
                           makeMsg(what, 'Public key mismatch'));
          if (ctx.signature) {
            var verifier = crypto.createVerify('RSA-SHA1');
            var pem = CLIENT_KEY_RSA_PUB.publicOrig;
            verifier.update(ctx.blob);
            assert(verifier.verify(pem, ctx.signature),
                   makeMsg(what, 'Could not verify PK signature'));
            ctx.accept();
          } else
            ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Authenticate with an RSA key'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          privateKey: CLIENT_KEY_PPK_RSA
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          assert(ctx.method === 'publickey',
                 makeMsg(what, 'Unexpected auth method: ' + ctx.method));
          assert(ctx.username === USER,
                 makeMsg(what, 'Unexpected username: ' + ctx.username));
          assert(ctx.key.algo === 'ssh-rsa',
                 makeMsg(what, 'Unexpected key algo: ' + ctx.key.algo));
          if (ctx.signature) {
            var verifier = crypto.createVerify('RSA-SHA1');
            var pem = CLIENT_KEY_PPK_RSA_PUB.publicOrig;
            verifier.update(ctx.blob);
            assert(verifier.verify(pem, ctx.signature),
                   makeMsg(what, 'Could not verify PK signature'));
            ctx.accept();
          } else
            ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Authenticate with an RSA key (PPK)'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          privateKey: CLIENT_KEY_DSA
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          assert(ctx.method === 'publickey',
                 makeMsg(what, 'Unexpected auth method: ' + ctx.method));
          assert(ctx.username === USER,
                 makeMsg(what, 'Unexpected username: ' + ctx.username));
          assert(ctx.key.algo === 'ssh-dss',
                 makeMsg(what, 'Unexpected key algo: ' + ctx.key.algo));
          assert.deepEqual(CLIENT_KEY_DSA_PUB.public,
                           ctx.key.data,
                           makeMsg(what, 'Public key mismatch'));
          if (ctx.signature) {
            var verifier = crypto.createVerify('DSA-SHA1');
            var pem = CLIENT_KEY_DSA_PUB.publicOrig;
            verifier.update(ctx.blob);
            assert(verifier.verify(pem, ctx.signature),
                   makeMsg(what, 'Could not verify PK signature'));
            ctx.accept();
          } else
            ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Authenticate with a DSA key'
  },
  { run: function() {
      if (semver.lt(process.version, '5.2.0'))
        return next();
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          privateKey: CLIENT_KEY_ECDSA
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          assert(ctx.method === 'publickey',
                 makeMsg(what, 'Unexpected auth method: ' + ctx.method));
          assert(ctx.username === USER,
                 makeMsg(what, 'Unexpected username: ' + ctx.username));
          assert(ctx.key.algo === 'ecdsa-sha2-nistp256',
                 makeMsg(what, 'Unexpected key algo: ' + ctx.key.algo));
          assert.deepEqual(CLIENT_KEY_ECDSA_PUB.public,
                           ctx.key.data,
                           makeMsg(what, 'Public key mismatch'));
          if (ctx.signature) {
            var verifier = crypto.createVerify('sha256');
            var pem = CLIENT_KEY_ECDSA_PUB.publicOrig;
            verifier.update(ctx.blob);
            assert(verifier.verify(pem, ctx.signature),
                   makeMsg(what, 'Could not verify PK signature'));
            ctx.accept();
          } else
            ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Authenticate with a ECDSA key'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: 'asdf'
        },
        { hostKeys: [HOST_KEY_DSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          assert(ctx.method === 'password',
                 makeMsg(what, 'Unexpected auth method: ' + ctx.method));
          assert(ctx.username === USER,
                 makeMsg(what, 'Unexpected username: ' + ctx.username));
          assert(ctx.password === 'asdf',
                 makeMsg(what, 'Unexpected password: ' + ctx.password));
          ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Server with DSA host key'
  },
  { run: function() {
      if (semver.lt(process.version, '5.2.0'))
        return next();
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: 'asdf'
        },
        { hostKeys: [HOST_KEY_ECDSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          assert(ctx.method === 'password',
                 makeMsg(what, 'Unexpected auth method: ' + ctx.method));
          assert(ctx.username === USER,
                 makeMsg(what, 'Unexpected username: ' + ctx.username));
          assert(ctx.password === 'asdf',
                 makeMsg(what, 'Unexpected password: ' + ctx.password));
          ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Server with ECDSA host key'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: 'asdf',
          algorithms: {
            serverHostKey: 'ssh-rsa'
          }
        },
        { hostKeys: [HOST_KEY_RSA, HOST_KEY_DSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          assert(ctx.method === 'password',
                 makeMsg(what, 'Unexpected auth method: ' + ctx.method));
          assert(ctx.username === USER,
                 makeMsg(what, 'Unexpected username: ' + ctx.username));
          assert(ctx.password === 'asdf',
                 makeMsg(what, 'Unexpected password: ' + ctx.password));
          ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Server with multiple host keys (RSA selected)'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: 'asdf',
          algorithms: {
            serverHostKey: 'ssh-dss'
          }
        },
        { hostKeys: [HOST_KEY_RSA, HOST_KEY_DSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          assert(ctx.method === 'password',
                 makeMsg(what, 'Unexpected auth method: ' + ctx.method));
          assert(ctx.username === USER,
                 makeMsg(what, 'Unexpected username: ' + ctx.username));
          assert(ctx.password === 'asdf',
                 makeMsg(what, 'Unexpected password: ' + ctx.password));
          ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Server with multiple host keys (DSA selected)'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var hostname = 'foo';
      var username = 'bar';

      r = setup(
        this,
        { username: USER,
          privateKey: CLIENT_KEY_RSA,
          localHostname: hostname,
          localUsername: username
        },
        { hostKeys: [ HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          if (ctx.method === 'hostbased') {
            assert(ctx.username === USER,
                   makeMsg(what, 'Unexpected username: ' + ctx.username));
            assert(ctx.key.algo === 'ssh-rsa',
                   makeMsg(what, 'Unexpected key algo: ' + ctx.key.algo));
            assert.deepEqual(CLIENT_KEY_RSA_PUB.public,
                             ctx.key.data,
                             makeMsg(what, 'Public key mismatch'));
            assert(ctx.signature,
                   makeMsg(what, 'Expected signature'));
            assert(ctx.localHostname === hostname,
                   makeMsg(what, 'Wrong local hostname'));
            assert(ctx.localUsername === username,
                   makeMsg(what, 'Wrong local username'));
            var verifier = crypto.createVerify('RSA-SHA1');
            var pem = CLIENT_KEY_RSA_PUB.publicOrig;
            verifier.update(ctx.blob);
            assert(verifier.verify(pem, ctx.signature),
                   makeMsg(what, 'Could not verify hostbased signature'));
            ctx.accept();
          } else
            ctx.reject();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Authenticate with hostbased'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          assert(ctx.method === 'password',
                 makeMsg(what, 'Unexpected auth method: ' + ctx.method));
          assert(ctx.username === USER,
                 makeMsg(what, 'Unexpected username: ' + ctx.username));
          assert(ctx.password === PASSWORD,
                 makeMsg(what, 'Unexpected password: ' + ctx.password));
          ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Authenticate with a password'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var verified = false;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD,
          hostHash: 'md5',
          hostVerifier: function(hash) {
            assert(hash === MD5_HOST_FINGERPRINT,
                   makeMsg(what, 'Host fingerprint mismatch'));
            return (verified = true);
          }
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      }).on('close', function() {
        assert(verified, makeMsg(what, 'Failed to verify host fingerprint'));
      });
    },
    what: 'Verify host fingerprint'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var out = '';
      var outErr = '';
      var exitArgs;
      var closeArgs;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.once('session', function(accept, reject) {
            var session = accept();
            session.once('exec', function(accept, reject, info) {
              assert(info.command === 'foo --bar',
                     makeMsg(what, 'Wrong exec command: ' + info.command));
              var stream = accept();
              stream.stderr.write('stderr data!\n');
              stream.write('stdout data!\n');
              stream.exit(100);
              stream.end();
              conn.end();
            });
          });
        });
      });
      client.on('ready', function() {
        client.exec('foo --bar', function(err, stream) {
          assert(!err, makeMsg(what, 'Unexpected exec error: ' + err));
          stream.on('data', function(d) {
            out += d;
          }).on('exit', function(code) {
            exitArgs = new Array(arguments.length);
            for (var i = 0; i < exitArgs.length; ++i)
              exitArgs[i] = arguments[i];
          }).on('close', function(code) {
            closeArgs = new Array(arguments.length);
            for (var i = 0; i < closeArgs.length; ++i)
              closeArgs[i] = arguments[i];
          }).stderr.on('data', function(d) {
            outErr += d;
          });
        });
      }).on('end', function() {
        assert.deepEqual(exitArgs,
                         [100],
                         makeMsg(what, 'Wrong exit args: ' + inspect(exitArgs)));
        assert.deepEqual(closeArgs,
                         [100],
                         makeMsg(what,
                                 'Wrong close args: ' + inspect(closeArgs)));
        assert(out === 'stdout data!\n',
               makeMsg(what, 'Wrong stdout data: ' + inspect(out)));
        assert(outErr === 'stderr data!\n',
               makeMsg(what, 'Wrong stderr data: ' + inspect(outErr)));
      });
    },
    what: 'Simple exec'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var out = '';

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.once('session', function(accept, reject) {
            var session = accept(),
                env = {};
            session.once('env', function(accept, reject, info) {
              env[info.key] = info.val;
              accept && accept();
            }).once('exec', function(accept, reject, info) {
              assert(info.command === 'foo --bar',
                     makeMsg(what, 'Wrong exec command: ' + info.command));
              var stream = accept();
              stream.write(''+env.SSH2NODETEST);
              stream.exit(100);
              stream.end();
              conn.end();
            });
          });
        });
      });
      client.on('ready', function() {
        client.exec('foo --bar',
                    { env: { SSH2NODETEST: 'foo' } },
                    function(err, stream) {
          assert(!err, makeMsg(what, 'Unexpected exec error: ' + err));
          stream.on('data', function(d) {
            out += d;
          });
        });
      }).on('end', function() {
        assert(out === 'foo',
               makeMsg(what, 'Wrong stdout data: ' + inspect(out)));
      });
    },
    what: 'Exec with environment set'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var out = '';

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.once('session', function(accept, reject) {
            var session = accept();
            var ptyInfo;
            session.once('pty', function(accept, reject, info) {
              ptyInfo = info;
              accept && accept();
            }).once('exec', function(accept, reject, info) {
              assert(info.command === 'foo --bar',
                     makeMsg(what, 'Wrong exec command: ' + info.command));
              var stream = accept();
              stream.write(JSON.stringify(ptyInfo));
              stream.exit(100);
              stream.end();
              conn.end();
            });
          });
        });
      });
      var pty = {
        rows: 2,
        cols: 4,
        width: 0,
        height: 0,
        term: 'vt220',
        modes: {}
      };
      client.on('ready', function() {
        client.exec('foo --bar',
                    { pty: pty },
                    function(err, stream) {
          assert(!err, makeMsg(what, 'Unexpected exec error: ' + err));
          stream.on('data', function(d) {
            out += d;
          });
        });
      }).on('end', function() {
        assert.deepEqual(JSON.parse(out),
                         pty,
                         makeMsg(what, 'Wrong stdout data: ' + inspect(out)));
      });
    },
    what: 'Exec with pty set'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var out = '';

      r = setup(
        this,
        { username: USER,
          password: PASSWORD,
          agent: '/foo/bar/baz'
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.once('session', function(accept, reject) {
            var session = accept();
            var authAgentReq = false;
            session.once('auth-agent', function(accept, reject) {
              authAgentReq = true;
              accept && accept();
            }).once('exec', function(accept, reject, info) {
              assert(info.command === 'foo --bar',
                     makeMsg(what, 'Wrong exec command: ' + info.command));
              var stream = accept();
              stream.write(inspect(authAgentReq));
              stream.exit(100);
              stream.end();
              conn.end();
            });
          });
        });
      });
      client.on('ready', function() {
        client.exec('foo --bar',
                    { agentForward: true },
                    function(err, stream) {
          assert(!err, makeMsg(what, 'Unexpected exec error: ' + err));
          stream.on('data', function(d) {
            out += d;
          });
        });
      }).on('end', function() {
        assert(out === 'true',
               makeMsg(what, 'Wrong stdout data: ' + inspect(out)));
      });
    },
    what: 'Exec with OpenSSH agent forwarding'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var out = '';

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.once('session', function(accept, reject) {
            var session = accept();
            var x11 = false;
            session.once('x11', function(accept, reject, info) {
              x11 = true;
              accept && accept();
            }).once('exec', function(accept, reject, info) {
              assert(info.command === 'foo --bar',
                     makeMsg(what, 'Wrong exec command: ' + info.command));
              var stream = accept();
              stream.write(inspect(x11));
              stream.exit(100);
              stream.end();
              conn.end();
            });
          });
        });
      });
      client.on('ready', function() {
        client.exec('foo --bar',
                    { x11: true },
                    function(err, stream) {
          assert(!err, makeMsg(what, 'Unexpected exec error: ' + err));
          stream.on('data', function(d) {
            out += d;
          });
        });
      }).on('end', function() {
        assert(out === 'true',
               makeMsg(what, 'Wrong stdout data: ' + inspect(out)));
      });
    },
    what: 'Exec with X11 forwarding'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var out = '';

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.once('session', function(accept, reject) {
            var session = accept();
            var sawPty = false;
            session.once('pty', function(accept, reject, info) {
              sawPty = true;
              accept && accept();
            }).once('shell', function(accept, reject) {
              var stream = accept();
              stream.write('Cowabunga dude! ' + inspect(sawPty));
              stream.end();
              conn.end();
            });
          });
        });
      });
      client.on('ready', function() {
        client.shell(function(err, stream) {
          assert(!err, makeMsg(what, 'Unexpected exec error: ' + err));
          stream.on('data', function(d) {
            out += d;
          });
        });
      }).on('end', function() {
        assert(out === 'Cowabunga dude! true',
               makeMsg(what, 'Wrong stdout data: ' + inspect(out)));
      });
    },
    what: 'Simple shell'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var expHandle = new Buffer([1, 2, 3, 4]);
      var sawOpenS = false;
      var sawCloseS = false;
      var sawOpenC = false;
      var sawCloseC = false;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.once('session', function(accept, reject) {
            var session = accept();
            session.once('sftp', function(accept, reject) {
              if (accept) {
                var sftp = accept();
                sftp.once('OPEN', function(id, filename, flags, attrs) {
                  assert(id === 0,
                         makeMsg(what, 'Unexpected sftp request ID: ' + id));
                  assert(filename === 'node.js',
                         makeMsg(what, 'Unexpected filename: ' + filename));
                  assert(flags === OPEN_MODE.READ,
                         makeMsg(what, 'Unexpected flags: ' + flags));
                  sawOpenS = true;
                  sftp.handle(id, expHandle);
                  sftp.once('CLOSE', function(id, handle) {
                    assert(id === 1,
                           makeMsg(what, 'Unexpected sftp request ID: ' + id));
                    assert.deepEqual(handle,
                                     expHandle,
                                     makeMsg(what,
                                             'Wrong sftp file handle: '
                                             + inspect(handle)));
                    sawCloseS = true;
                    sftp.status(id, STATUS_CODE.OK);
                    conn.end();
                  });
                });
              }
            });
          });
        });
      });
      client.on('ready', function() {
        client.sftp(function(err, sftp) {
          assert(!err, makeMsg(what, 'Unexpected sftp error: ' + err));
          sftp.open('node.js', 'r', function(err, handle) {
            assert(!err, makeMsg(what, 'Unexpected sftp error: ' + err));
            assert.deepEqual(handle,
                             expHandle,
                             makeMsg(what,
                                     'Wrong sftp file handle: '
                                     + inspect(handle)));
            sawOpenC = true;
            sftp.close(handle, function(err) {
              assert(!err, makeMsg(what, 'Unexpected sftp error: ' + err));
              sawCloseC = true;
            });
          });
        });
      }).on('end', function() {
        assert(sawOpenS, makeMsg(what, 'Expected sftp open()'));
        assert(sawOpenC, makeMsg(what, 'Expected sftp open() callback'));
        assert(sawCloseS, makeMsg(what, 'Expected sftp open()'));
        assert(sawOpenC, makeMsg(what, 'Expected sftp close() callback'));
      });
    },
    what: 'Simple SFTP'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var state = {
        readies: 0,
        closes: 0
      };
      var clientcfg = {
        username: USER,
        password: PASSWORD
      };
      var servercfg = {
        hostKeys: [HOST_KEY_RSA]
      };
      var reconnect = false;

      client = new Client(),
      server = new Server(servercfg);

      function onReady() {
        assert(++state.readies <= 4,
               makeMsg(what, 'Wrong ready count: ' + state.readies));
      }
      function onClose() {
        assert(++state.closes <= 3,
               makeMsg(what, 'Wrong close count: ' + state.closes));
        if (state.closes === 2)
          server.close();
        else if (state.closes === 3)
          next();
      }

      server.listen(0, 'localhost', function() {
        clientcfg.host = 'localhost';
        clientcfg.port = server.address().port;
        client.connect(clientcfg);
      });

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', onReady);
      }).on('close', onClose);
      client.on('ready', function() {
        onReady();
        if (reconnect)
          client.end();
        else {
          reconnect = true;
          client.connect(clientcfg);
        }
      }).on('close', onClose);
    },
    what: 'connect() on connected client'
  },
  { run: function() {
      var what = this.what;
      var client = new Client({
        username: USER,
        password: PASSWORD
      });

      assert.throws(function() {
        client.exec('uptime', function(err, stream) {
          assert(false, makeMsg(what, 'Callback unexpectedly called'));
        });
      });
      next();
    },
    what: 'Throw when not connected'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var calledBack = 0;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        });
      });
      client.on('ready', function() {
        function callback(err, stream) {
          assert(err, makeMsg(what, 'Expected error'));
          assert(err.message === 'No response from server',
                 makeMsg(what, 'Wrong error message: ' + err.message));
          ++calledBack;
        }
        client.exec('uptime', callback);
        client.shell(callback);
        client.sftp(callback);
        client.end();
      }).on('close', function() {
        // give the callbacks a chance to execute
        process.nextTick(function() {
          assert(calledBack === 3,
                 makeMsg(what, 'Only '
                               + calledBack
                               + '/3 outstanding callbacks called'));
        });
      });
    },
    what: 'Outstanding callbacks called on disconnect'
  },
  { run: function() {
      var what = this.what;
      var client = new Client({
        username: USER,
        password: PASSWORD
      });

      assert.throws(function() {
        client.exec('uptime', function(err, stream) {
          assert(false, makeMsg(what, 'Callback unexpectedly called'));
        });
      });
      next();
    },
    what: 'Throw when not connected'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var calledBack = 0;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.on('session', function(accept, reject) {
            var session = accept();
            session.once('exec', function(accept, reject, info) {
              var stream = accept();
              stream.exit(0);
              stream.end();
            });
          });
        });
      });
      client.on('ready', function() {
        function callback(err, stream) {
          assert(!err, makeMsg(what, 'Unexpected error: ' + err));
          stream.resume();
          if (++calledBack === 3)
            client.end();
        }
        client.exec('foo', callback);
        client.exec('bar', callback);
        client.exec('baz', callback);
      }).on('end', function() {
        assert(calledBack === 3,
               makeMsg(what, 'Only '
                             + calledBack
                             + '/3 callbacks called'));
      });
    },
    what: 'Pipelined requests'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var calledBack = 0;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD,
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          var reqs = [];
          conn.on('session', function(accept, reject) {
            if (reqs.length === 0) {
              conn.rekey(function(err) {
                assert(!err, makeMsg(what, 'Unexpected rekey error: ' + err));
                reqs.forEach(function(accept) {
                  var session = accept();
                  session.once('exec', function(accept, reject, info) {
                    var stream = accept();
                    stream.exit(0);
                    stream.end();
                  });
                });
              });
            }
            reqs.push(accept);
          });
        });
      });
      client.on('ready', function() {
        function callback(err, stream) {
          assert(!err, makeMsg(what, 'Unexpected error: ' + err));
          stream.resume();
          if (++calledBack === 3)
            client.end();
        }
        client.exec('foo', callback);
        client.exec('bar', callback);
        client.exec('baz', callback);
      }).on('end', function() {
        assert(calledBack === 3,
               makeMsg(what, 'Only '
                             + calledBack
                             + '/3 callbacks called'));
      });
    },
    what: 'Pipelined requests with intermediate rekeying'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.on('session', function(accept, reject) {
            var session = accept();
            session.once('exec', function(accept, reject, info) {
              var stream = accept();
              stream.exit(0);
              stream.end();
            });
          });
        });
      });
      client.on('ready', function() {
        client.exec('foo', function(err, stream) {
          assert(!err, makeMsg(what, 'Unexpected error: ' + err));
          stream.on('exit', function(code, signal) {
            client.end();
          });
        });
      });
    },
    what: 'Ignore outgoing after stream close'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.on('session', function(accept, reject) {
            accept().on('sftp', function(accept, reject) {
              var sftp = accept();
              // XXX: hack to get channel ...
              var channel = sftp._readableState.pipes;

              channel.unpipe(sftp);
              sftp.unpipe(channel);

              channel.exit(127);
              channel.close();
            });
          });
        });
      });
      client.on('ready', function() {
        var timeout = setTimeout(function() {
          assert(false, makeMsg(what, 'Unexpected SFTP timeout'));
        }, 1000);
        client.sftp(function(err, sftp) {
          clearTimeout(timeout);
          assert(err, makeMsg(what, 'Expected error'));
          assert(err.code === 127,
                 makeMsg(what, 'Expected exit code 127, saw: ' + err.code));
          client.end();
        });
      });
    },
    what: 'SFTP server aborts with exit-status'
  },
  { run: function() {
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD,
          sock: new net.Socket()
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {});
      });
      client.on('ready', function() {
        client.end();
      });
    },
    what: 'Double pipe on unconnected, passed in net.Socket'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        });
        conn.on('request', function(accept, reject, name, info) {
          accept();
          conn.forwardOut('good', 0, 'remote', 12345, function(err, ch) {
            if (err) {
              assert(!err, makeMsg(what, 'Unexpected error: ' + err));
            }
            conn.forwardOut('bad', 0, 'remote', 12345, function(err, ch) {
              assert(err, makeMsg(what, 'Should receive error'));
              client.end();
            });
          });
        });
      });

      client.on('ready', function() {
        // request forwarding
        client.forwardIn('good', 0, function(err, port) {
          if (err) {
            assert(!err, makeMsg(what, 'Unexpected error: ' + err));
          }
        });
      });
      client.on('tcp connection', function(details, accept, reject) {
        accept();
      });
    },
    what: 'Client auto-rejects unrequested, allows requested forwarded-tcpip'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA],
          banner: 'Hello world!'
        }
      );
      client = r.client;
      server = r.server;

      client.on('greeting', function(greeting) {
        assert.strictEqual(greeting, 'Hello world!\r\n');
      });

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          assert(ctx.method === 'password',
                 makeMsg(what, 'Unexpected auth method: ' + ctx.method));
          assert(ctx.username === USER,
                 makeMsg(what, 'Unexpected username: ' + ctx.username));
          assert(ctx.password === PASSWORD,
                 makeMsg(what, 'Unexpected password: ' + ctx.password));
          ctx.accept();
        }).on('ready', function() {
          conn.end();
        });
      });
    },
    what: 'Server banner'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;
      var fastRejectSent = false;

      function sendAcceptLater(accept) {
        if (fastRejectSent)
          accept();
        else
          setImmediate(sendAcceptLater, accept);
      }

      r = setup(
        this,
        { username: USER },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        });

        conn.on('request', function(accept, reject, name, info) {
          if (info.bindAddr === 'fastReject') {
            // Will call reject on 'fastReject' soon
            reject();
            fastRejectSent = true;
          } else
            // but accept on 'slowAccept' later
            sendAcceptLater(accept);
        });
      });

      client.on('ready', function() {
        var replyCnt = 0;

        client.forwardIn('slowAccept', 0, function(err) {
          assert(!err, makeMsg(what, 'Unexpected error: ' + err));
          if (++replyCnt === 2)
            client.end();
        });

        client.forwardIn('fastReject', 0, function(err) {
          assert(err, makeMsg(what, 'Should receive error'));
          if (++replyCnt === 2)
            client.end();
        });
      });
    },
    what: 'Server responds to global requests in the right order'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      var timer;
      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.on('session', function(accept, reject) {
            var session = accept();
            session.once('subsystem', function(accept, reject, info) {
              assert.equal(info.name, 'netconf');

              // Prevent success reply from being sent
              conn._sshstream.channelSuccess = function() {};

              var stream = accept();
              stream.close();
              timer = setTimeout(function() {
                throw new Error(makeMsg(what, 'Expected client callback'));
              }, 50);
            });
          });
        });
      });
      client.on('ready', function() {
        client.subsys('netconf', function(err, stream) {
          clearTimeout(timer);
          assert(err);
          client.end();
        });
      });
    },
    what: 'Cleanup outstanding channel requests on channel close'
  },
  { run: function() {
      var what = this.what;
      var client;
      var server;
      var r;

      r = setup(
        this,
        { username: USER,
          password: PASSWORD
        },
        { hostKeys: [HOST_KEY_RSA] }
      );
      client = r.client;
      server = r.server;

      var timer;
      server.on('connection', function(conn) {
        conn.on('authentication', function(ctx) {
          ctx.accept();
        }).on('ready', function() {
          conn.on('session', function(accept, reject) {
            var session = accept();
            session.once('exec', function(accept, reject, info) {
              var stream = accept();
              // Write enough to bring the Client's channel window to 0
              // (currently 1MB)
              var buf = new Buffer(2048);
              for (var i = 0; i < 1000; ++i)
                stream.write(buf);
              stream.exit(0);
              stream.close();
            });
          });
        });
      });
      client.on('ready', function() {
        client.exec('foo', function(err, stream) {
          var sawClose = false;
          assert(!err, makeMsg(what, 'Unexpected error'));
          client._sshstream.on('CHANNEL_CLOSE:' + stream.incoming.id, onClose);
          function onClose() {
            // This handler gets called *after* the internal handler, so we
            // should have seen `stream`'s `close` event already if the bug
            // exists
            assert(!sawClose, makeMsg(what, 'Premature close event'));
            client.end();
          }
          stream.on('close', function() {
            sawClose = true;
          });
        });
      });
    },
    what: 'Channel emits close prematurely'
  },
];

function setup(self, clientcfg, servercfg) {
  self.state = {
    clientReady: false,
    serverReady: false,
    clientClose: false,
    serverClose: false
  };

  if (DEBUG) {
    console.log('========================================================\n'
                + '[TEST] '
                + self.what
                + '\n========================================================');
    clientcfg.debug = function(str) {
      console.log('[CLIENT] ' + str);
    };
    servercfg.debug = function(str) {
      console.log('[SERVER] ' + str);
    };
  }

  var client = new Client();
  var server = new Server(servercfg);

  server.on('error', onError)
        .on('connection', function(conn) {
          conn.on('error', onError)
              .on('ready', onReady);
          server.close();
        })
        .on('close', onClose);
  client.on('error', onError)
        .on('ready', onReady)
        .on('close', onClose);

  function onError(err) {
    var which = (this === client ? 'client' : 'server');
    assert(false, makeMsg(self.what, 'Unexpected ' + which + ' error: ' + err));
  }
  function onReady() {
    if (this === client) {
      assert(!self.state.clientReady,
             makeMsg(self.what, 'Received multiple ready events for client'));
      self.state.clientReady = true;
    } else {
      assert(!self.state.serverReady,
             makeMsg(self.what, 'Received multiple ready events for server'));
      self.state.serverReady = true;
    }
    if (self.state.clientReady && self.state.serverReady)
      self.onReady && self.onReady();
  }
  function onClose() {
    if (this === client) {
      assert(!self.state.clientClose,
             makeMsg(self.what, 'Received multiple close events for client'));
      self.state.clientClose = true;
    } else {
      assert(!self.state.serverClose,
             makeMsg(self.what, 'Received multiple close events for server'));
      self.state.serverClose = true;
    }
    if (self.state.clientClose && self.state.serverClose)
      next();
  }

  process.nextTick(function() {
    server.listen(0, 'localhost', function() {
      if (clientcfg.sock)
        clientcfg.sock.connect(server.address().port, 'localhost');
      else {
        clientcfg.host = 'localhost';
        clientcfg.port = server.address().port;
      }
      client.connect(clientcfg);
    });
  });
  return { client: client, server: server };
}

function next() {
  if (Array.isArray(process._events.exit))
    process._events.exit = process._events.exit[1];
  if (++t === tests.length)
    return;

  var v = tests[t];
  v.run.call(v);
}

function makeMsg(what, msg) {
  return '[' + group + what + ']: ' + msg;
}

process.once('uncaughtException', function(err) {
  if (t > -1 && !/(?:^|\n)AssertionError: /i.test(''+err))
    console.log(makeMsg(tests[t].what, 'Unexpected Exception:'));
  throw err;
});
process.once('exit', function() {
  assert(t === tests.length,
         makeMsg('_exit',
                 'Only finished ' + t + '/' + tests.length + ' tests'));
});

next();
