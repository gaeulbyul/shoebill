const fs = require('fs');
const path = require('path');
const URL = require('url');
const EventEmitter = require('events');
const _ = require('lodash');
const got = require('got');
const UUID = require('uuid/v4');


class FileMonitor extends EventEmitter {}

function formatFileSize (bytes) {
  const units = ['B', 'KB', 'MB'];
  const k = 1000;
  let i = 0;
  for (i = 0; i < units.length; i++) {
    if (bytes < k ** (i + 1)) {
      return (bytes / (k ** i)).toFixed(2) + ' ' + units[i];
    }
  }
  i += 1;
  return (bytes / (k ** i)).toFixed(2) + ' ' + units[i];
}

function calcProgress (status) {
  const { startedAt, progress, total } = status;
  const now = Date.now();
  const remainSize = total - progress;
  const time = (now - startedAt) / 1000;
  const speed = progress / time;
  const percentage = 100 * (progress / total);
  return {
    progress: formatFileSize(progress),
    total: formatFileSize(total),
    percentage: Math.round(percentage),
    speed: formatFileSize(Math.round(speed)),
  };
}

class Downloader {
  constructor () {
    this.queue = [];
  }
  installIPC (ipcMain, ipcRenderer) {
    this.ipcMain = ipcMain;
    this.ipcRenderer = ipcRenderer;
    ipcMain.on('ipc.renderer.shoebill.downloader/add', (event, args) => {
      const { url, destpath } = args;
      event.returnValue = this.add(url, destpath);
    });
  }
  reportProgress (progress) {
    try {
      this.ipcRenderer.send('ipc.main.shoebill.downloader/report-progress', {
        queue: this.queue,
      });
    } catch (error) {
      console.error(error);
    }
  }
  reportResult (result) {
    try {
      this.ipcRenderer.send('ipc.main.shoebill.downloader/report-result', { result });
    } catch (error) {
      console.error(error);
    }
  }
  monitor (file) {
    const monitor = new FileMonitor;
    const { id, stream } = file;
    let progressLength = 0;
    let totalLength = 0;
    stream.on('response', response => {
      totalLength = parseInt(response.headers['content-length'], 10);
    });
    stream.on('data', chunk => {
      const len = (chunk || '').length;
      progressLength += len;
      const progress = calcProgress({
        total: totalLength,
        progress: progressLength,
        startedAt: file.startedAt,
      });
      monitor.emit('progress', progress);
    });
    stream.on('error', error => {
      console.error(error);
      this.reportResult({
        id,
        status: 'error',
        error,
      });
    });
    stream.on('end', () => {
      this.reportResult({
        id,
        status: 'complete',
        error: null,
      });
    });
    return monitor;
  }
  add (url, destpath) {
    const id = UUID();
    const downloadStream = got.stream(url);
    const file = {
      id,
      startedAt: Date.now(),
      stream: downloadStream,
      progress: null,
    };
    this.queue.push(file);
    const monitor = this.monitor(file);
    const throttledReportProgress = _.throttle(this.reportProgress.bind(this), 400);
    monitor.on('progress', progress => {
      file.progress = progress;
      throttledReportProgress();
    });
    downloadStream.pipe(fs.createWriteStream(destpath));
    return file;
  }
}

module.exports = Downloader;
