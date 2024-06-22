const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const schedule = require('node-schedule');
const moment = require('moment'); // 引入 moment 库用于日期处理

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
    // ... (其他数据处理逻辑保持不变) ...
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
  }
};

// 每天凌晨0点执行一次数据拉取
schedule.scheduleJob('0 0 * * *', fetchRSSFeed);

// 定义RESTful API端点
app.get('/api/data', (req, res) => {
  const now = moment(); // 获取当前时间
  const twoDaysAgo = now.clone().subtract(2, 'days'); // 计算两天前的时间

  // 筛选两天以内的 RSS 数据
  const filteredData = cachedData.filter(item => {
    const pubDate = moment(item.pubDate); // 将 pubDate 字段转换为 moment 对象
    return pubDate.isAfter(twoDaysAgo); // 判断 pubDate 是否在两天以内
  });

  res.json(filteredData); 
});

// 启动服务器
app.listen(port, async () => {
  await fetchRSSFeed(); // 初始化数据拉取
  console.log(`Server is running on http://localhost:${port}`);
});

// 初始数据拉取
fetchRSSFeed();
