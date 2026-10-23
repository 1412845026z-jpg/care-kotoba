import {apiKey,json} from '@/lib/ai-server';
export async function GET(){return json({configured:!!apiKey(),version:'0.1',voice:'realtime',text:'gpt-4.1-mini'});}
