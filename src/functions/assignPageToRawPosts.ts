import { APIGatewayProxyResult, SQSEvent } from 'aws-lambda';
import { errorHandler } from '../utils/errorHandler.util';
import { successReturn } from '../utils/successReturn.util';
import { getMonthAndYear } from '../helpers/getMonthAndYear';
import { validate } from '../validator';
import { apiHandler } from '../utils/apiHandler.util';
import { getPreviousMonthAndYear } from '../helpers/getPreviousMonthAndYear';
import AWS from 'aws-sdk';
const sqs = new AWS.SQS();

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

interface Message {
    nicheId: string;
}

interface RawPostItem {
    _id: string;
    source_url: string;
    originalViews: number;
    source: string;
    nicheId: string;
    video_url: string;
    media_url: string;
    cover_url: string;
    caption: string;
    originalVideoPublishSchedule: {
        month: string;
        year: string | number;
    };
    schedule?: {
        month: string;
        year: string | number;
    };
    page?: string;
}

interface NichePage {
    _id: string;
    name: string;
    stage: string;
    nicheId: string;
}

interface Stage {
    name: string;
    postsRequired: number;
}

interface IPagePostCollectionCount {
    postsRequired: number;
    postsCollected: number;
}

interface AddPagesToRawPostsBody {
    posts: {
        id: string;
        page: string;
    }[];
}

export const lambdaHandler = async (event: SQSEvent): Promise<APIGatewayProxyResult> => {
    const invincibleUrl = process.env.InvincibleUrl || '';
    const kairosQueueUrl = process.env.KairosQueueUrl || '';
    const message = JSON.parse(event.Records[0].body) as Message;

    const { nicheId } = message;
    validate('nicheId', nicheId, true);

    try {
        const { month, year } = getMonthAndYear();

        // Get All Month Niche Raw Posts
        const getAllMonthNicheRawPostsUrl = `${invincibleUrl}/rawPosts/month/${nicheId}/${month}/${year}`;

        const monthNicheRawPosts: RawPostItem[] = await apiHandler('get', getAllMonthNicheRawPostsUrl);

        // Filter Posts by Previous Month
        const { previousMonth, previousYear } = getPreviousMonthAndYear(month, Number(year));

        const postsFilteredByPreviousMonth: RawPostItem[] = [];

        monthNicheRawPosts.forEach((element) => {
            const { originalVideoPublishSchedule } = element;

            if (
                originalVideoPublishSchedule.month === previousMonth &&
                originalVideoPublishSchedule.year === previousYear
            )
                postsFilteredByPreviousMonth.push(element);
        });

        // Get All Niche Pages
        const getNichePagesUrl = `${invincibleUrl}/igpage/niche/${nicheId}`;

        const nichePages: NichePage[] = await apiHandler('get', getNichePagesUrl);

        // Get Posts Required For Each Stage
        const getStagesUrl = `${invincibleUrl}/stage/all`;

        const stages: Stage[] = await apiHandler('get', getStagesUrl);

        const pagePostsRequired: Record<string, IPagePostCollectionCount> = {};

        // Create an object to store postsRequired for each page
        nichePages.forEach((nichePage) => {
            const { name, stage } = nichePage;
            const { postsRequired } = stages.find((item) => item.name === stage) as Stage;

            pagePostsRequired[name] = { postsRequired, postsCollected: 0 };
        });

        // Sort Posts According to originalViews

        postsFilteredByPreviousMonth.sort((a, b) => b.originalViews - a.originalViews);

        let currentPageNumber = 0;

        postsFilteredByPreviousMonth.forEach((post) => {
            if (currentPageNumber === nichePages.length) return;

            const currentPagePostsRequired = pagePostsRequired[nichePages[currentPageNumber].name];
            const { postsCollected, postsRequired } = currentPagePostsRequired;
            post.page = nichePages[currentPageNumber].name;

            currentPagePostsRequired.postsCollected = postsCollected + 1;
            if (currentPagePostsRequired.postsCollected == postsRequired) currentPageNumber += 1;
        });

        // Filter out unassigned posts
        const postsWithPages = postsFilteredByPreviousMonth.filter((post) => post.page && post);

        let modifiedCount = 0;

        // Don't Make DB operation if postsWithPages is empty
        if (postsWithPages.length) {
            // Add Pages To RawPosts

            const addPagesToRawPostsBody: AddPagesToRawPostsBody = {
                posts: [],
            };

            postsWithPages.forEach((post) => {
                const item = { id: post._id, page: post.page as string };

                addPagesToRawPostsBody.posts.push(item);
            });

            const addPagesToRawPostsUrl = `${invincibleUrl}/rawPosts/addPages`;

            const updatedPosts = await apiHandler('post', addPagesToRawPostsUrl, addPagesToRawPostsBody);

            modifiedCount = updatedPosts.modifiedCount;

            // Add nicheId To Kairos Queue
            const params = {
                MessageBody: JSON.stringify({ nicheId }),
                QueueUrl: kairosQueueUrl,
            };

            await sqs.sendMessage(params).promise();
        }

        return successReturn(`Assigned Page To ${modifiedCount} Posts`);
    } catch (err) {
        return errorHandler(err);
    }
};
