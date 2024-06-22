const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const schedule = require('node-schedule');
const moment = require('moment'); 

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
      // 只保留 link 键值对
      newItem.link = item.link[0];
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
  const now = moment(); 
  const twoDaysAgo = now.clone().subtract(2, 'days'); 

  // 筛选两天以内的 RSS 数据
  const filteredData = cachedData.filter(item => {
    const pubDate = moment(item.pubDate); 
    return pubDate.isAfter(twoDaysAgo); 
  });

  // 只保留 link 键值对
  const linksOnlyData = filteredData.map(item => ({ link: item.link })); 

  res.json(linksOnlyData); 
});

// 启动服务器
app.listen(port, async () => {
  await fetchRSSFeed(); // 初始化数据拉取
  console.log(`Server is running on http://localhost:${port}`);
});

// 初始数据拉取
fetchRSSFeed();
