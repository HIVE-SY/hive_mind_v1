require('dotenv').config();
const { listUpcomingMeetings } = require('../utils/calendar');

async function testCalendar() {
  try {
    console.log('📅 Fetching upcoming meetings...');
    const meetings = await listUpcomingMeetings();
    
    if (meetings.length === 0) {
      console.log('No upcoming meetings found');
    } else {
      console.log('\nUpcoming meetings:');
      meetings.forEach(meeting => {
        console.log(`\n📌 ${meeting.summary}`);
        console.log(`   Start: ${new Date(meeting.start).toLocaleString()}`);
        console.log(`   Link: ${meeting.link}`);
      });
    }
  } catch (error) {
    console.error('❌ Error testing calendar:', error);
  }
}

testCalendar(); 