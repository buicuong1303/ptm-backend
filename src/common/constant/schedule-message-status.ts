export enum ScheduleMessageStatus {
  WAITING = 'waiting', //* waiting to scheduler start
  SENDING = 'sending', //* after scheduler running
  PAUSING = 'pausing', //* when user pause
  STOP = 'stopped', //* when user stop
  DONE = 'done', //* after all job finished, all schedule_set is done
  ERROR = 'error',
  TIMEOUT = 'timeout',
  ISSUE = 'issue',
}
