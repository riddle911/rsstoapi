const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const schedule = require('node-schedule');

const app = express();
const port = 3001;

let cachedData = [];

// 定期每隔一天拉取RSS feed数据
const fetchRSSFeed = async () => {
  try {
    const response = await axios.get('https://feed.informer.com/digests/X2JZSRTTF6/feeder.rss');
    const data = await xml2js.parseStringPromise(response.data);
    const items = data.rss.channel[0].item;

    // 处理数据，将每个值从数组中提取出来并转换为单独的键值对
    const newData = items.map(item => {
      const newItem = {};
      Object.keys(item).forEach(key => {
        newItem[key] = item[key][0]; // 将值从数组中提取出来
      });
      if (item.source && item.source[0] && item.source[0].$ && item.source[0].$.url) {
        newItem.source = item.source[0].$.url;
      }

      // 处理guid字段
      if (item.guid && item.guid[0] && item.guid[0]._) {
        newItem.guid = item.guid[0]._;
      }
      return newItem;
    });

    // 使用pubDate对数据进行去重
    const uniqueData = newData.filter(item => {
      const pubDate = item.pubDate;
      return !cachedData.some(cachedItem => cachedItem.pubDate === pubDate);
    });

    // 更新缓存数据
    cachedData = [...cachedData, ...uniqueData];
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
  }
};

// 每天凌晨0点执行一次数据拉取
schedule.scheduleJob('0 0 * * *', fetchRSSFeed);

// 定义RESTful API端点
app.get('/api/data', (req, res) => {
  res.json(cachedData);
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// 初始数据拉取
fetchRSSFeed();
