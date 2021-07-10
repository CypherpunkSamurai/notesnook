import React, {useEffect, useState} from 'react';
import {
  Clipboard,
  Dimensions,
  Keyboard,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';
import Share from 'react-native-share';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {notesnook} from '../../../e2e/test.ids';
import {useTracked} from '../../provider';
import {Actions} from '../../provider/Actions';
import {
  useMenuStore,
  useSelectionStore,
  useTrashStore,
  useUserStore,
} from '../../provider/stores';
import {DDS} from '../../services/DeviceDetection';
import {eSendEvent, openVault, ToastEvent} from '../../services/EventManager';
import Navigation from '../../services/Navigation';
import Sync from '../../services/Sync';
import {editing, toTXT} from '../../utils';
import {
  ACCENT,
  COLOR_SCHEME,
  COLOR_SCHEME_DARK,
  COLOR_SCHEME_LIGHT,
  setColorScheme,
} from '../../utils/Colors';
import {db} from '../../utils/DB';
import {
  eOpenMoveNoteDialog,
  eOpenPublishNoteDialog,
  eOpenTagsDialog,
} from '../../utils/Events';
import {deleteItems} from '../../utils/functions';
import {MMKV} from '../../utils/mmkv';
import {SIZE} from '../../utils/SizeUtils';
import {sleep, timeConverter} from '../../utils/TimeUtils';
import {Button} from '../Button';
import {presentDialog} from '../Dialog/functions';
import Heading from '../Typography/Heading';
import Paragraph from '../Typography/Paragraph';
import {ActionSheetColorsSection} from './ActionSheetColorsSection';
import {ActionSheetTagsSection} from './ActionSheetTagsSection';
const w = Dimensions.get('window').width;

export const ActionSheetComponent = ({
  close = () => {},
  item,
  hasColors = false,
  hasTags = false,
  rowItems = [],
  getRef,
}) => {
  const [state, dispatch] = useTracked();
  const {colors} = state;
  const clearSelection = useSelectionStore(state => state.clearSelection);
  const setSelectedItem = useSelectionStore(state => state.setSelectedItem);
  const setMenuPins = useMenuStore(state => state.setMenuPins);
  const [isPinnedToMenu, setIsPinnedToMenu] = useState(
    db.settings.isPinned(item.id),
  );
  const [note, setNote] = useState(item);
  const user = useUserStore(state => state.user);
  const lastSynced = useUserStore(state => state.lastSynced);

  const refreshing = false;
  const isPublished = db.monographs.isPublished(note.id);
  const noteInTopic =
    editing.actionAfterFirstSave.type === 'topic' &&
    db.notebooks
      .notebook(editing.actionAfterFirstSave.notebook)
      .topics.topic(editing.actionAfterFirstSave.id)
      .has(item.id);

  useEffect(() => {
    if (item.id === null) return;

    sleep(1000).then(() => {
      setNote({...item});
      if (item.type !== note) {
        setIsPinnedToMenu(db.settings.isPinned(note.id));
      }
    });
  }, [item]);

  function changeColorScheme(colors = COLOR_SCHEME, accent = ACCENT) {
    let newColors = setColorScheme(colors, accent);
    dispatch({type: Actions.THEME, colors: newColors});
  }

  const localRefresh = (type, nodispatch = false) => {
    if (!note || !note.id) return;
    let _item;

    switch (type) {
      case 'note': {
        _item = db.notes.note(note.id)?.data;
        break;
      }
      case 'notebook': {
        _item = db.notebooks.notebook(note.id)?.data;
        break;
      }
      case 'topic': {
        _item = db.notebooks.notebook(note.notebookId).topics.topic(note.title);
        break;
      }
    }
    if (!_item || !_item.id) return;

    if (!nodispatch) {
      Navigation.setRoutesToUpdate([
        Navigation.routeNames.NotesPage,
        Navigation.routeNames.Favorites,
        Navigation.routeNames.Notes,
        Navigation.routeNames.Notebooks,
        Navigation.routeNames.Notebook,
        Navigation.routeNames.Tags,
        Navigation.routeNames.Trash,
      ]);
    }

    setNote({..._item});
  };

  const rowItemsData = [
    {
      name: 'Dark Mode',
      title: 'Dark mode',
      icon: 'theme-light-dark',
      func: () => {
        if (!colors.night) {
          MMKV.setStringAsync('theme', JSON.stringify({night: true}));
          changeColorScheme(COLOR_SCHEME_DARK);
        } else {
          MMKV.setStringAsync('theme', JSON.stringify({night: false}));
          changeColorScheme(COLOR_SCHEME_LIGHT);
        }
      },
      switch: true,
      on: colors.night ? true : false,
      close: false,
      nopremium: true,
      id: notesnook.ids.dialogs.actionsheet.night,
    },
    {
      name: 'Add to notebook',
      title: 'Add to notebook',
      icon: 'book-outline',
      func: () => {
        close();
        clearSelection();
        setSelectedItem(note);
        setTimeout(() => {
          eSendEvent(eOpenMoveNoteDialog, note);
        }, 300);
      },
    },
    {
      name: 'Pin',
      title: note.pinned ? 'Unpin from top' : 'Pin to top',
      icon: note.pinned ? 'pin-off-outline' : 'pin-outline',
      func: async () => {
        if (!note.id) return;
        close();
        if (note.type === 'note') {
          if (db.notes.pinned.length === 3 && !note.pinned) {
            ToastEvent.show({
              heading: 'Cannot pin more than 3 notes',
              type: 'error',
              context: 'local',
            });
            return;
          }
          await db.notes.note(note.id).pin();
        } else {
          if (db.notebooks.pinned.length === 3 && !note.pinned) {
            ToastEvent.show({
              heading: 'Cannot pin more than 3 notebooks',
              type: 'error',
              context: 'local',
            });
            return;
          }
          await db.notebooks.notebook(note.id).pin();
        }
        localRefresh(item.type);
      },
      close: false,
      check: true,
      on: note.pinned,
      nopremium: true,
      id: notesnook.ids.dialogs.actionsheet.pin,
    },
    {
      name: 'Favorite',
      title: !note.favorite ? 'Add to favorites' : 'Remove from favorites',
      icon: note.favorite ? 'star-off' : 'star-outline',
      func: async () => {
        if (!note.id) return;
        close();
        if (note.type === 'note') {
          await db.notes.note(note.id).favorite();
        } else {
          await db.notebooks.notebook(note.id).favorite();
        }
        Navigation.setRoutesToUpdate([
          Navigation.routeNames.NotesPage,
          Navigation.routeNames.Favorites,
          Navigation.routeNames.Notes,
        ]);
        localRefresh(item.type, true);
      },
      close: false,
      check: true,
      on: note.favorite,
      nopremium: true,
      id: notesnook.ids.dialogs.actionsheet.favorite,
      color: 'orange',
    },

    {
      name: 'Edit Notebook',
      title: 'Edit notebook',
      icon: 'square-edit-outline',
      func: () => {
        close('notebook');
      },
    },
    {
      name: 'Edit Topic',
      title: 'Edit topic',
      icon: 'square-edit-outline',
      func: () => {
        close('topic');
      },
    },
    {
      name: 'Copy',
      title: 'Copy',
      icon: 'content-copy',
      func: async () => {
        if (note.locked) {
          openVault({
            copyNote: true,
            novault: true,
            locked: true,
            item: note,
            title: 'Copy note',
            description: 'Unlock note to copy to clipboard.',
          });
        } else {
          let text = await db.notes.note(note.id).content();
          text = toTXT(text);
          text = `${note.title}\n \n ${text}`;
          Clipboard.setString(text);
          ToastEvent.show({
            heading: 'Note copied to clipboard',
            type: 'success',
            context: 'local',
          });
        }
      },
    },
    {
      name: 'Restore',
      icon: 'delete-restore',
      func: async () => {
        close();
        await db.trash.restore(note.id);
        Navigation.setRoutesToUpdate([
          Navigation.routeNames.Tags,
          Navigation.routeNames.Notes,
          Navigation.routeNames.Notebooks,
          Navigation.routeNames.NotesPage,
          Navigation.routeNames.Favorites,
          Navigation.routeNames.Trash,
        ]);
        type = note.type === 'trash' ? note.itemType : note.type;

        ToastEvent.show({
          heading:
            type === 'note'
              ? 'Note restored from trash'
              : 'Notebook restored from trash',
          type: 'success',
        });
      },
    },

    {
      name: 'Publish',
      title: 'Publish',
      icon: 'cloud-upload-outline',
      func: async () => {
        if (!user) {
          ToastEvent.show({
            heading: 'Login required',
            message: 'Login to publish note',
            context: 'local',
            func: () => {
              eSendEvent(eOpenLoginDialog);
            },
            actionText: 'Login',
          });
          return;
        }

        if (!user.isEmailConfirmed) {
          ToastEvent.show({
            heading: 'Email not verified',
            message: 'Please verify your email first.',
            context: 'local',
          });
          return;
        }
        if (note.locked) {
          ToastEvent.show({
            heading: 'Locked notes cannot be published',
            type: 'error',
            context: 'local',
          });
          return;
        }
        close();
        await sleep(300);
        eSendEvent(eOpenPublishNoteDialog, note);
      },
    },
    {
      name: 'Vault',
      title: note.locked ? 'Remove from vault' : 'Add to vault',
      icon: note.locked ? 'shield-off-outline' : 'shield-outline',
      func: async () => {
        if (!note.id) return;
        if (note.locked) {
          close('unlock');
        } else {
          db.vault
            .add(note.id)
            .then(r => {
              let n = db.notes.note(note.id).data;
              if (n.locked) {
                close();
              }
              Navigation.setRoutesToUpdate([
                Navigation.routeNames.NotesPage,
                Navigation.routeNames.Favorites,
                Navigation.routeNames.Notes,
              ]);
              localRefresh(note.type);
            })
            .catch(async e => {
              switch (e.message) {
                case db.vault.ERRORS.noVault:
                  close('novault');
                  break;
                case db.vault.ERRORS.vaultLocked:
                  close('locked');
                  break;
                case db.vault.ERRORS.wrongPassword:
                  close();
                  break;
              }
            });
        }
      },
      on: note.locked,
    },

    {
      name: 'Add Shortcut',
      title: isPinnedToMenu ? 'Remove Shortcut' : 'Add Shortcut',
      icon: isPinnedToMenu ? 'link-variant-remove' : 'link-variant',
      func: async () => {
        close();
        try {
          if (isPinnedToMenu) {
            await db.settings.unpin(note.id);
          } else {
            if (item.type === 'topic') {
              await db.settings.pin(note.type, {
                id: note.id,
                notebookId: note.notebookId,
              });
            } else {
              await db.settings.pin(note.type, {id: note.id});
            }
          }
          setIsPinnedToMenu(db.settings.isPinned(note.id));
          setMenuPins();
        } catch (e) {}
      },
      close: false,
      check: true,
      on: isPinnedToMenu,
      nopremium: true,
      id: notesnook.ids.dialogs.actionsheet.pinMenu,
    },
    {
      name: 'Share',
      title: 'Share',
      icon: 'share-variant',
      func: async () => {
        if (note.locked) {
          close();
          openVault({
            item: item,
            novault: true,
            locked: true,
            share: true,
            title: 'Share note',
            description: 'Unlock note to share it.',
          });
        } else {
          let text = await db.notes.note(note.id).export('txt');
          let m = `${note.title}\n \n ${text}`;
          Share.open({
            title: 'Share note to',
            failOnCancel: false,
            message: m,
          });
        }
      },
    },
    {
      name: 'Export',
      title: 'Export',
      icon: 'export',
      func: () => {
        close('export');
      },
    },
    {
      name: 'RemoveTopic',
      title: 'Remove from topic',
      hidden: !noteInTopic,
      icon: 'minus-circle-outline',
      func: async () => {
        await db.notebooks
          .notebook(editing.actionAfterFirstSave.notebook)
          .topics.topic(editing.actionAfterFirstSave.id)
          .delete(note.id);
        Navigation.setRoutesToUpdate([
          Navigation.routeNames.Notebooks,
          Navigation.routeNames.Notes,
          Navigation.routeNames.NotesPage,
          Navigation.routeNames.Notebook,
        ]);
        setNote(db.notes.note(note.id).data);
        close();
      },
    },
    {
      name: 'Delete',
      title:
        note.type !== 'notebook' && note.type !== 'note'
          ? 'Delete ' + item.type
          : 'Move to trash',
      icon: 'delete-outline',
      type: 'error',
      func: async () => {
        close();
        if (note.locked) {
          await sleep(300);
          openVault({
            deleteNote: true,
            novault: true,
            locked: true,
            item: note,
            title: 'Delete note',
            description: 'Unlock note to delete it.',
          });
        } else {
          try {
            close();
            await deleteItems(note);
          } catch (e) {}
        }
      },
    },
    {
      name: 'PermDelete',
      icon: 'delete',
      func: async () => {
        close();
        await sleep(300);
        presentDialog({
          title: `Permanent delete`,
          paragraph: `Are you sure you want to delete this ${note.itemType} permanantly from trash?`,
          positiveText: 'Delete',
          negativeText: 'Cancel',
          positivePress: async () => {
            await db.trash.delete(note.id);
            useTrashStore.getState().setTrash();
            useSelectionStore.getState().setSelectionMode(false);
            ToastEvent.show({
              heading: 'Permanantly deleted items',
              type: 'success',
              context: 'local',
            });
          },
          positiveType: 'errorShade',
        });
      },
    },
  ];

  let columnsCount = rowItems.length < 5 ? rowItems.length : 5;
  const _renderRowItem = rowItem => (
    <TouchableOpacity
      onPress={rowItem.func}
      key={rowItem.name}
      testID={'icon-' + rowItem.name}
      style={{
        alignItems: 'center',
        width: DDS.isTab
          ? (400 - 24) / rowItems.length
          : (w - 24) / columnsCount,
        marginBottom: 5,
      }}>
      <View
        style={{
          height: 50,
          width: 50,
          borderRadius: 5,
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          textAlignVertical: 'center',
          marginBottom: DDS.isTab ? 7 : 3.5,
          backgroundColor: colors.nav,
        }}>
        <Icon
          name={rowItem.icon}
          size={DDS.isTab ? SIZE.xl : SIZE.lg}
          color={rowItem.name === 'Delete' ? colors.errorText : colors.accent}
        />
      </View>

      <Paragraph size={SIZE.sm} style={{textAlign: 'center'}}>
        {rowItem.title}
      </Paragraph>
    </TouchableOpacity>
  );

  const onScrollEnd = () => {
    getRef().current?.handleChildScrollEnd();
  };

  return (
    <ScrollView
      nestedScrollEnabled
      onScrollEndDrag={onScrollEnd}
      onScrollAnimationEnd={onScrollEnd}
      onMomentumScrollEnd={onScrollEnd}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
      onLayout={() => {
        if (!item.dateDeleted) {
          localRefresh(item.type, true);
        }
      }}
      style={{
        backgroundColor: colors.bg,
        paddingHorizontal: 0,
        borderBottomRightRadius: DDS.isLargeTablet() ? 10 : 1,
        borderBottomLeftRadius: DDS.isLargeTablet() ? 10 : 1,
      }}>
      <TouchableOpacity
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
        }}
        onPress={() => {
          Keyboard.dismiss();
        }}
      />

      {!note || !note.id ? (
        <Paragraph style={{marginVertical: 10, alignSelf: 'center'}}>
          Start writing to save your note.
        </Paragraph>
      ) : (
        <View
          style={{
            paddingHorizontal: 12,
            alignItems: 'center',
            marginTop: 5,
            zIndex: 10,
          }}>
          <Heading
            style={{
              maxWidth: '90%',
              textAlign: 'center',
            }}
            size={SIZE.md}>
            {note.type === 'tag' ? '#' : null}
            {note?.title.replace('\n', '')}
          </Heading>

          {note.headline || note.description ? (
            <Paragraph
              numberOfLines={2}
              style={{
                width: '90%',
                textAlign: 'center',
                maxWidth: '90%',
              }}>
              {note.type === 'notebook' && note.description
                ? note.description
                : null}
              {note.type === 'note' && note.headline
                ? note.headline[item.headline.length - 1] === '\n'
                  ? note.headline.slice(0, note.headline.length - 1)
                  : note.headline
                : null}
            </Paragraph>
          ) : null}

          <Paragraph
            color={colors.icon}
            size={SIZE.xs}
            style={{
              textAlignVertical: 'center',
              marginTop: 2.5,
            }}>
            {note.type === 'note' || (note.type === 'tag' && note.dateEdited)
              ? 'Last edited on ' + timeConverter(note.dateEdited)
              : null}
            {note.type !== 'note' &&
            note.type !== 'tag' &&
            note.dateCreated &&
            !note.dateDeleted
              ? ' Created on ' + timeConverter(note.dateCreated)
              : null}
            {note.dateDeleted
              ? 'Deleted on ' + timeConverter(note.dateDeleted)
              : null}
          </Paragraph>

          {hasTags && note ? (
            <ActionSheetTagsSection
              close={close}
              item={note}
              localRefresh={localRefresh}
            />
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              marginTop: 5,
              width: '90%',
              maxWidth: '90%',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
            {note.type === 'notebook' &&
            note &&
            note.topics &&
            note.topics.length > 0
              ? note.topics
                  .sort((a, b) => a.dateEdited - b.dateEdited)
                  .slice(0, 6)
                  .map(topic => (
                    <Button
                      key={topic.id}
                      title={topic.title}
                      type="accent"
                      height={30}
                      onPress={() => {
                        close();
                        let routeName = 'NotesPage';
                        let params = {...topic, menu: false, get: 'topics'};
                        let headerState = {
                          heading: topic.title,
                          id: topic.id,
                          type: topic.type,
                        };
                        Navigation.navigate(routeName, params, headerState);
                      }}
                      fontSize={SIZE.sm - 1}
                      style={{
                        marginRight: 5,
                        paddingHorizontal: 0,
                        borderRadius: 100,
                        paddingHorizontal: 12,
                        marginTop: 5,
                      }}
                    />
                  ))
              : null}

            {note.type === 'note' && isPublished && (
              <Button
                title="Published"
                type="shade"
                height={30}
                fontSize={SIZE.sm - 1}
                style={{
                  margin: 1,
                  marginRight: 5,
                  paddingHorizontal: 0,
                  borderRadius: 100,
                  paddingHorizontal: 12,
                }}
              />
            )}
            {note.type !== 'note' || refreshing ? null : (
              <Button
                onPress={async () => await Sync.run('local')}
                title={
                  user && lastSynced > note.dateEdited ? 'Synced' : 'Sync Now'
                }
                type="shade"
                height={30}
                fontSize={SIZE.sm}
                style={{
                  margin: 1,
                  marginRight: 5,
                  paddingHorizontal: 0,
                  borderRadius: 100,
                  paddingHorizontal: 12,
                }}
              />
            )}

            {note.type === 'note' && (
              <Button
                onPress={async () => {
                  close();
                  await sleep(300);
                  eSendEvent(eOpenTagsDialog, note);
                }}
                title="Add tags"
                type="accent"
                icon="plus"
                iconPosition="right"
                height={30}
                fontSize={SIZE.sm}
                style={{
                  margin: 1,
                  marginRight: 5,
                  paddingHorizontal: 0,
                  borderRadius: 100,
                  paddingHorizontal: 12,
                }}
              />
            )}
          </View>
        </View>
      )}

      {hasColors && note.id ? (
        <ActionSheetColorsSection close={close} item={note} />
      ) : null}

      {note.id || note.dateCreated ? (
        <FlatList
          data={rowItemsData.filter(
            i => rowItems.indexOf(i.name) > -1 && !i.hidden,
          )}
          keyExtractor={item => item.title}
          numColumns={rowItems.length < 5 ? rowItems.length : 5}
          style={{
            marginTop: note.type !== 'note' ? 10 : 0,
            borderTopWidth: 1,
            borderColor: colors.nav,
            paddingTop: 20,
          }}
          columnWrapperStyle={{
            justifyContent: 'flex-start',
          }}
          contentContainerStyle={{
            alignSelf: 'center',
          }}
          renderItem={({item, index}) => _renderRowItem(item)}
        />
      ) : null}

      {note.type === 'note' && user && lastSynced >= note.dateEdited ? (
        <View
          style={{
            paddingVertical: 10,
            width: '95%',
            alignItems: 'flex-start',
            paddingHorizontal: 12,
            marginTop: 25,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignSelf: 'center',
          }}>
          <Icon name="shield-key-outline" color={colors.accent} size={40} />

          <View
            style={{
              flex: 1,
              marginLeft: 5,
            }}>
            <Heading
              color={colors.accent}
              style={{
                fontSize: SIZE.md,
              }}>
              This note is encrypted and synced
            </Heading>
            <Paragraph
              style={{
                flexWrap: 'wrap',
                flexBasis: 1,
              }}
              color={colors.pri}>
              No one can read it except you.
            </Paragraph>
          </View>
        </View>
      ) : null}

      {DDS.isTab ? (
        <View
          style={{
            height: 20,
          }}
        />
      ) : null}
    </ScrollView>
  );
};
