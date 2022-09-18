import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import bootstrap from 'bootstrap'
import { t } from '../../utils/i18n'
import Projects from '../../api/projects/projects.js'
import Timecards from '../../api/timecards/timecards.js'
import Autocomplete from '../../utils/autocomplete'
import './projectInfoPopup.js'
import './projectsearch.html'

Template.projectsearch.onCreated(function createProjectSearch() {
  this.subscribe('myprojects', {})
  this.selectedId = new ReactiveVar()
  this.tcid = new ReactiveVar()
  this.projects = new ReactiveVar([])
  this.autorun(() => {
    if (this.data.tcid && this.data.tcid?.get()) {
      this.tcid.set(this.data.tcid?.get())
    } else if (FlowRouter.getParam('tcid')) {
      this.tcid.set(FlowRouter.getParam('tcid'))
    }
    if (this.tcid.get()) {
      this.subscribe('singleTimecard', this.tcid.get())
    }
  })

  this.autorun(() => {
    if (this.subscriptionsReady()) {
      if (this.data.projectId && this.data.projectId.get() && this.data.projectId.get() !== 'all') {
        const project = Projects.findOne({ _id: this.data.projectId.get() })
        this.$('.js-target-project').val(project?.name)
        this.$('.js-target-project').get(0).setAttribute('data-value', project?._id)
        this.selectedId.set(this.data.projectId.get())
      } else if (FlowRouter.getParam('projectId')) {
        const project = Projects.findOne({ _id: FlowRouter.getParam('projectId') })
        if (FlowRouter.getParam('projectId') !== 'all') {
          this.$('.js-target-project').val(project?.name)
          this.$('.js-target-project').get(0).setAttribute('data-value', project?._id)
          this.selectedId.set(FlowRouter.getParam('projectId'))
        }
      } else if (this.tcid.get()) {
        const project = Projects
          .findOne({ _id: Timecards.findOne({ _id: this.tcid.get() })?.projectId })
        this.$('.js-target-project').val(project.name)
        this.$('.js-target-project').get(0).setAttribute('data-value', project?._id)
        this.selectedId.set(project._id)
      }
    }
  })
})
Template.projectsearch.helpers({
  selectedId: () => Template.instance().selectedId.get(),
  displayProjectInfo: () => Template.instance().data.displayProjectInfo
    && Template.instance().selectedId.get(),
})

Template.projectsearch.onRendered(() => {
  const templateInstance = Template.instance()
  templateInstance.targetProject = new Autocomplete(templateInstance.$('.js-target-project').get(0), {
    data: [],
    maximumItems: 5,
    threshold: 0,
    onSelectItem: ({ label, value }) => {
      templateInstance.$('.js-target-project').removeClass('is-invalid')
      templateInstance.selectedId.set(value)
      if (!(templateInstance.data.tcid && templateInstance.data.tcid.get())) {
        FlowRouter.setParams({ projectId: value })
      }
      if (!Projects.findOne({ _id: templateInstance.selectedId.get() })?.defaultTask) {
        templateInstance.$('.js-tasksearch-input').first().trigger('focus')
        // $('.js-tasksearch-input').first().trigger('click')
      } else {
        $('#hours').first().trigger('focus')
      }
    },
  })
  templateInstance.autorun(() => {
    if (templateInstance.subscriptionsReady()) {
      let projectlist = Projects.find(
        { $or: [{ archived: { $exists: false } }, { archived: false }] },
        { sort: { priority: 1, name: 1 } },
      ).fetch().map((entry) => ({ label: entry.name, value: entry._id }))
      if (FlowRouter.getQueryParam('customer') && FlowRouter.getQueryParam('customer') !== 'all') {
        projectlist = Projects.find(
          {
            customer: FlowRouter.getQueryParam('customer'),
            $or: [{ archived: { $exists: false } }, { archived: false }],
          },
          { sort: { priority: 1, name: 1 } },
        ).fetch().map((entry) => ({ label: entry.name, value: entry.name }))
      }
      if (templateInstance.data.allProjects) {
        projectlist.push({ label: t('overview.all_projects'), value: 'all' })
      }
      if (projectlist.length > 0) {
        templateInstance.targetProject?.setData(projectlist)
      }
    }
  })
})