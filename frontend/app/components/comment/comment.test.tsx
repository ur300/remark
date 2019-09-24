/** @jsx h */
import { h } from 'preact';
import { mount } from 'enzyme';
import { Props, Comment } from './comment';
import { User, Comment as CommentType, PostInfo } from '@app/common/types';
import { sleep } from '@app/utils/sleep';

const DefaultProps: Partial<Props> = {
  post_info: {
    read_only: false,
  } as PostInfo,
  view: 'main',
  data: {
    text: 'test comment',
    vote: 0,
    user: {
      id: 'someone',
      picture: 'somepicture-url',
    },
    locator: {
      url: 'somelocatorurl',
      site: 'remark',
    },
  } as CommentType,
  user: {
    admin: false,
    id: 'testuser',
  } as User,
};

describe('<Comment />', () => {
  describe('voting', () => {
    it('disabled on user info widget', () => {
      const element = mount(<Comment {...({ ...DefaultProps, view: 'user' } as Props)} />);

      const voteButtons = element.find('.comment__vote');
      expect(voteButtons.length).toStrictEqual(2);

      voteButtons.forEach(b => {
        expect(b.getDOMNode().getAttribute('aria-disabled')).toStrictEqual('true');
        expect(b.getDOMNode().getAttribute('title')).toStrictEqual("Voting allowed only on post's page");
      });
    });

    it('disabled on read only post', () => {
      const element = mount(
        <Comment {...({ ...DefaultProps, post_info: { ...DefaultProps.post_info, read_only: true } } as Props)} />
      );

      const voteButtons = element.find('.comment__vote');
      expect(voteButtons.length).toStrictEqual(2);

      voteButtons.forEach(b => {
        expect(b.getDOMNode().getAttribute('aria-disabled')).toStrictEqual('true');
        expect(b.getDOMNode().getAttribute('title')).toStrictEqual("Can't vote on read-only topics");
      });
    });

    it('disabled for deleted comment', () => {
      const element = mount(
        // ahem
        <Comment {...({ ...DefaultProps, data: { ...DefaultProps.data, delete: true } } as Props)} />
      );

      const voteButtons = element.find('.comment__vote');
      expect(voteButtons.length).toStrictEqual(2);

      voteButtons.forEach(b => {
        expect(b.getDOMNode().getAttribute('aria-disabled')).toStrictEqual('true');
        expect(b.getDOMNode().getAttribute('title')).toStrictEqual("Can't vote for deleted comment");
      });
    });

    it('disabled for guest', () => {
      const element = mount(
        <Comment
          {...({
            ...DefaultProps,
            user: {
              id: 'someone',
              picture: 'somepicture-url',
            },
          } as Props)}
        />
      );

      const voteButtons = element.find('.comment__vote');
      expect(voteButtons.length).toStrictEqual(2);

      voteButtons.forEach(b => {
        expect(b.getDOMNode().getAttribute('aria-disabled')).toStrictEqual('true');
        expect(b.getDOMNode().getAttribute('title')).toStrictEqual("Can't vote for your own comment");
      });
    });

    it('disabled for own comment', () => {
      const element = mount(<Comment {...({ ...DefaultProps, user: null } as Props)} />);

      const voteButtons = element.find('.comment__vote');
      expect(voteButtons.length).toStrictEqual(2);

      voteButtons.forEach(b => {
        expect(b.getDOMNode().getAttribute('aria-disabled')).toStrictEqual('true');
        expect(b.getDOMNode().getAttribute('title')).toStrictEqual('Sign in to vote');
      });
    });

    it('disabled for already upvoted comment', async () => {
      const voteSpy = jest.fn(async () => {});
      const element = mount(
        <Comment
          {...(DefaultProps as Props)}
          data={{ ...DefaultProps.data, vote: +1 } as Props['data']}
          putCommentVote={voteSpy}
        />
      );

      const voteButtons = element.find('.comment__vote');
      expect(voteButtons.length).toStrictEqual(2);

      expect(
        voteButtons
          .at(0)
          .getDOMNode()
          .getAttribute('aria-disabled')
      ).toStrictEqual('true');
      voteButtons.at(0).simulate('click');
      await sleep(100);
      expect(voteSpy).not.toBeCalled();

      expect(
        voteButtons
          .at(1)
          .getDOMNode()
          .getAttribute('aria-disabled')
      ).toStrictEqual('false');
      voteButtons.at(1).simulate('click');
      await sleep(100);
      expect(voteSpy).toBeCalled();
    }, 30000);

    it('disabled for already downvoted comment', async () => {
      const voteSpy = jest.fn(async () => {});
      const element = mount(
        <Comment
          {...(DefaultProps as Props)}
          data={{ ...DefaultProps.data, vote: -1 } as Props['data']}
          putCommentVote={voteSpy}
        />
      );

      const voteButtons = element.find('.comment__vote');
      expect(voteButtons.length).toStrictEqual(2);

      expect(
        voteButtons
          .at(1)
          .getDOMNode()
          .getAttribute('aria-disabled')
      ).toStrictEqual('true');
      voteButtons.at(1).simulate('click');
      await sleep(100);
      expect(voteSpy).not.toBeCalled();

      expect(
        voteButtons
          .at(0)
          .getDOMNode()
          .getAttribute('aria-disabled')
      ).toStrictEqual('false');
      voteButtons.at(0).simulate('click');
      await sleep(100);
      expect(voteSpy).toBeCalled();
    }, 30000);
  });

  describe('admin controls', () => {
    it('for admin if shows admin controls', () => {
      const element = mount(
        <Comment {...({ ...DefaultProps, user: { ...DefaultProps.user, admin: true } } as Props)} />
      );

      const controls = element.find('.comment__controls > span');
      expect(controls.length).toBe(5);
      expect(controls.at(0).text()).toEqual('Copy');
      expect(controls.at(1).text()).toEqual('Pin');
      expect(controls.at(2).text()).toEqual('Hide');
      expect(controls.at(3).getDOMNode().childNodes[0].textContent).toEqual('Block');
      expect(controls.at(4).text()).toEqual('Delete');
    });

    it('for regular user it shows only "hide"', () => {
      const element = mount(
        <Comment {...({ ...DefaultProps, user: { ...DefaultProps.user, admin: false } } as Props)} />
      );

      const controls = element.find('.comment__controls > span');
      expect(controls.length).toBe(1);
      expect(controls.at(0).text()).toEqual('Hide');
    });

    it('verification badge clickable for admin', () => {
      const element = mount(
        <Comment {...({ ...DefaultProps, user: { ...DefaultProps.user, admin: true } } as Props)} />
      );

      const controls = element.find('.comment__verification').first();
      expect(controls.hasClass('comment__verification_clickable')).toEqual(true);
    });

    it('verification badge not clickable for regular user', () => {
      const element = mount(
        <Comment
          {...({
            ...DefaultProps,
            data: { ...DefaultProps.data, user: { ...DefaultProps.data!.user, verified: true } },
          } as Props)}
        />
      );

      const controls = element.find('.comment__verification').first();
      expect(controls.hasClass('comment__verification_clickable')).toEqual(false);
    });
  });
});
