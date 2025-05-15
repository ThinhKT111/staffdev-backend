/**
 * Script kiểm tra chức năng đánh chỉ mục từ database sang Elasticsearch
 */

const { Client } = require('pg');
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');

// Disable TLS certificate verification for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testElasticsearchIndexing() {
  // Kết nối PostgreSQL
  const pgClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '26121999',
    database: 'staffdev'
  });

  // Kết nối Elasticsearch
  const esClient = new ElasticsearchClient({
    node: 'https://localhost:9200',
    auth: {
      username: 'elastic',
      password: '26121999'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    // Kết nối PostgreSQL
    await pgClient.connect();
    console.log('✅ Kết nối PostgreSQL thành công');

    // Kiểm tra kết nối Elasticsearch
    const esInfo = await esClient.info();
    console.log(`✅ Kết nối Elasticsearch thành công (phiên bản ${esInfo.version.number})`);

    // Lấy dữ liệu từ bảng ForumPosts
    console.log('\n🔄 Lấy dữ liệu từ bảng ForumPosts...');
    const postsResult = await pgClient.query('SELECT post_id, title, content, created_at FROM ForumPosts LIMIT 5');
    console.log(`   Đã lấy ${postsResult.rows.length} bài viết`);

    // Kiểm tra index forum_posts trên Elasticsearch
    console.log('\n🔄 Kiểm tra index "forum_posts"...');
    let indexExists = false;
    try {
      const existsResult = await esClient.indices.exists({ index: 'forum_posts' });
      indexExists = existsResult;
      console.log(`   Index "forum_posts" ${indexExists ? 'đã tồn tại' : 'chưa tồn tại'}`);
    } catch (err) {
      console.log(`   ❌ Lỗi kiểm tra index: ${err.message}`);
    }

    // Tạo index nếu chưa tồn tại
    if (!indexExists) {
      console.log('   🔄 Tạo index "forum_posts"...');
      try {
        await esClient.indices.create({
          index: 'forum_posts',
          body: {
            mappings: {
              properties: {
                post_id: { type: 'integer' },
                title: { type: 'text' },
                content: { type: 'text' },
                created_at: { type: 'date' }
              }
            }
          }
        });
        console.log('   ✅ Đã tạo index thành công');
      } catch (err) {
        console.log(`   ❌ Lỗi tạo index: ${err.message}`);
      }
    }

    // Đánh chỉ mục dữ liệu
    console.log('\n🔄 Đánh chỉ mục dữ liệu...');
    const operations = postsResult.rows.flatMap(post => [
      { index: { _index: 'forum_posts', _id: post.post_id } },
      { 
        post_id: post.post_id,
        title: post.title,
        content: post.content,
        created_at: post.created_at
      }
    ]);

    if (operations.length > 0) {
      try {
        const bulkResponse = await esClient.bulk({ refresh: true, operations });
        if (bulkResponse.errors) {
          console.log('   ⚠️ Có lỗi trong quá trình đánh chỉ mục:');
          bulkResponse.items.forEach(item => {
            if (item.index && item.index.error) {
              console.log(`   - ID: ${item.index._id}, Lỗi: ${item.index.error.reason}`);
            }
          });
        } else {
          console.log(`   ✅ Đã đánh chỉ mục ${postsResult.rows.length} bài viết thành công`);
        }
      } catch (err) {
        console.log(`   ❌ Lỗi đánh chỉ mục: ${err.message}`);
      }
    }

    // Tìm kiếm thử
    console.log('\n🔄 Thực hiện tìm kiếm...');
    try {
      const searchResponse = await esClient.search({
        index: 'forum_posts',
        body: {
          query: {
            match: {
              title: 'JavaScript'
            }
          }
        }
      });

      console.log(`   ✅ Tìm thấy ${searchResponse.hits.total.value} kết quả`);
      searchResponse.hits.hits.forEach(hit => {
        console.log(`   - ID: ${hit._id}, Score: ${hit._score}, Tiêu đề: ${hit._source.title}`);
      });
    } catch (err) {
      console.log(`   ❌ Lỗi tìm kiếm: ${err.message}`);
    }

  } catch (err) {
    console.error(`❌ Lỗi: ${err.message}`);
  } finally {
    await pgClient.end();
    console.log('\n✅ Đã đóng kết nối PostgreSQL');
  }
}

testElasticsearchIndexing(); 