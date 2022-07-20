export enum MessageSetStatus {
  WAITING = 'waiting', //* not create Message
  SENT = 'sent',
  SENDING = 'sending', //* not create Message
  PAUSING = 'pausing', //* create Message and add job to Bull Queue
  DONE = 'done', //* job in queue is finished
  STOP = 'stopped', //* job in queue is stop
  ERROR = 'error', //* ocurred error
  LATE = 'late',
}
